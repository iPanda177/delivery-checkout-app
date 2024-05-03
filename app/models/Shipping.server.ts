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
          inventoryItem {
            id
            inventoryLevel(locationId: $locationId) {
              edges {
                node {
                  available
                  location {
                    id
                  }
                }
              }

            }
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
    }
  });

  if (!dbRuleData) {
    return null;
  }

  const uniqueLocations = dbRuleData.locations.map((item: any) => item.location);
  dbRuleData.locations = Array.from(new Set(uniqueLocations));

  return dbRuleData;
}

export async function prepareShipmentsArray(
  shippingRules: dbRuleData[],
  variants: { id: string, quantity: string }[],
  graphql: GraphQLClient<AdminOperations>
) {
  const shipments: any[] = [];

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

  variantsData.forEach((variant: any) => {
    const isLtl = variant.product.tags.includes("ltl");
    const isSmallParcel = variant.product.tags.includes("small-parcel");

    const availableLocations = variant.inventoryItem.inventoryLevels.edges.map((edge: any) => edge.node.location.name);

    let minETA: number = Number.MAX_SAFE_INTEGER;
    let selectedRule: dbRuleData | undefined;
    let selectedLocation: string | undefined;

    shippingRules.forEach((rule) => {
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
        containsFreightItem: selectedRule.addOnProductId,
        isLtl: isLtl,
      });
    }
  });

  return shipments;
}
