import db from "../db.server";
// @ts-ignore
import type {GraphQLClient} from "@shopify/shopify-app-remix/build/ts/server/clients/types";
import type {AdminOperations} from "@shopify/admin-api-client";
import type {dbRuleData} from "~/types/types";

export async function getShopLocations(graphql: GraphQLClient<AdminOperations>) {
  const response = await graphql(
    `
      query fulfillmentLocations {
        locationsAvailableForDeliveryProfilesConnection(first: 100) {
          nodes {
            id
            name
            isActive
            hasActiveInventory
          }
        }
      }
    ` as string
  );

  const {
    data: {
      locationsAvailableForDeliveryProfilesConnection: { nodes: locations },
    },
  } = await response.json();

  return locations;
}

export async function getProductVariantData(id: string, graphql: GraphQLClient<AdminOperations>) {
  const response = await graphql(
    `
      query getProductVariant($id: ID!) {
        productVariant(id: $id) {
          displayName
          image {
            url
            altText
          }
        }
      }
    ` as string,
    {
      variables: {
        id: id,
        locationId: "gid://shopify/Location/1",
      },
    }
  );

  const {
    data: {
      productVariant,
    },

  } = await response.json();

  return productVariant;
}

export async function getShippingRule(id: number) {
  const dbRuleData: any = await db.shippingRules.findFirst({
    where: { id },
    include: {
      locations: {
        include: {
          location: true
        }
      },
      zipCodeRanges: true,
      deliveryTypes: {
        include: {
          deliveryType: true
        }
      },
    }
  });

  if (!dbRuleData) {
    return null;
  }

  const uniqueLocations = dbRuleData.locations.map((item: any) => item.location);
  dbRuleData.locations = Array.from(new Set(uniqueLocations));

  const deliveryTypes = dbRuleData.deliveryTypes.map((item: any) => item.deliveryType);
  dbRuleData.deliveryTypes = Array.from(new Set(deliveryTypes));

  return dbRuleData;
}

export async function prepareShipmentsArray(
  shippingRules: dbRuleData[],
  variants: { id: string, quantity: string }[],
  graphql: GraphQLClient<AdminOperations>
) {
  const shipments: any[] = [];
  let rulesList: any[] = [...shippingRules];

  const variantsDataPromises = variants.map(async (variant) => {
    const variantQuery = await graphql(`
      query {
        productVariant(id: "${variant.id}") {
          id
          title
          displayName
          product {
            tags
          }
          inventoryItem {
            id
            inventoryLevels(first: 25, query: "available:>${variant.quantity}") {
              edges {
                node {
                  id
                  available
                  location {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }` as string
    );

    return variantQuery.json();
  })

  const variantsDataResponses = await Promise.all(variantsDataPromises);

  const variantsData = variantsDataResponses.map((variantData: any) => {
    return variantData.data.productVariant;
  });

  if (rulesList.length === 0) {
    const locations = Array.from(
      new Set(variantsData.map((variant: any) => variant.inventoryItem.inventoryLevels.edges.map((edge: any) => edge.node.location.name)).flat())
    );
    if (locations.length === 0) {
      return false;
    }

    const defaultShippingRules = await db.shippingRules.findMany({
      where: {
        isDefault: true,
        locations: {
          some: {
            location: {
              locationName: {
                in: locations,
              }
            }
          },
        }
      },
      include: {
        locations: {
          include: {
            location: true
          }
        },
        zipCodeRanges: true,
        deliveryTypes: {
          include: {
            deliveryType: true
          }
        }
      }
    });

    if (defaultShippingRules.length === 0) {
      return false;
    }

    rulesList = [...defaultShippingRules];
  }


  variantsData.forEach((variant: any) => {
    const isLtl = variant.product.tags.includes("ltl");
    const isSmallParcel = variant.product.tags.includes("small-parcel");

    const availableLocations = variant.inventoryItem.inventoryLevels.edges.map((edge: any) => edge.node.location.name);

    let minETA: number = Number.MAX_SAFE_INTEGER;
    let selectedRule: dbRuleData | undefined;
    let selectedLocation: string | undefined;

    rulesList.forEach((rule) => {
      rule.locations.forEach((location: any) => {
        if (availableLocations.includes(location.location.locationName)) {
          let etaLow: number;
          if (isLtl) {
            etaLow = rule.etaDaysFreightLow;
          } else if (isSmallParcel) {
            etaLow = rule.etaDaysSmallParcelLow;
          } else {
            etaLow = rule.etaDaysSmallParcelLow;
          }
          if (etaLow < minETA) {
            minETA = etaLow;
            selectedRule = rule;
            selectedLocation = location.location.locationName;
          }
        }
      });
    });

    const existingShipmentIndex = shipments.findIndex(shipment => shipment.fulfillingLocationName === selectedLocation);

    if (existingShipmentIndex !== -1) {
      shipments[existingShipmentIndex].lineItems.push(variant);

      if (isLtl && !shipments[existingShipmentIndex].isLtl) {
        shipments[existingShipmentIndex].isLtl = true;
      }
    } else if (selectedRule) {
      shipments.push({
        id: variant.id,
        lineItems: [variant],
        fulfillingLocationName: selectedLocation,
        etaSmallParcelLow: selectedRule.etaDaysSmallParcelLow,
        etaSmallParcelHigh: selectedRule.etaDaysSmallParcelHigh,
        etaFreightLow: selectedRule.etaDaysFreightLow,
        etaFreightHigh: selectedRule.etaDaysFreightHigh,
        ineligibleForLtl: selectedRule.ineligibleForLtl,
        containsFreightItem: selectedRule.addOnProductId,
        isLtl: isLtl,
        deliveryTypes: selectedRule.deliveryTypes.map((deliveryType: any) => deliveryType.deliveryType.name),
      });
    }
  });

  return shipments;
}

export const getLocationData = async (locationId: string, graphql: GraphQLClient<AdminOperations>) => {
  const gid = `gid://shopify/Location/${locationId}`;
  const response = await graphql(
    `
      query getLocation($gid: ID!) {
        location(id: $gid) {
          id
          name
        }
      }
    ` as string,
    {
      variables: {
        gid,
      },
    }
  );

  const {
    data: { location },
  } = await response.json();

  return { locationId: location.id, locationName: location.name };
};
