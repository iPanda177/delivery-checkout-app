import db from "../db.server";
// @ts-ignore
import type {GraphQLClient} from "@shopify/shopify-app-remix/build/ts/server/clients/types";
import type {AdminOperations} from "@shopify/admin-api-client";
import {dbRuleData} from "~/types/types";
import {ShippingRules} from "@prisma/client";

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
    `
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
    `,
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

export async function getShippingRule(id: number, graphql: GraphQLClient<AdminOperations>) {
  const dbRuleData = await db.shippingRules.findFirst({
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

  const uniqueLocations = dbRuleData.locations.map(item => item.location);
  const uniqueLocationsArray = Array.from(new Set(uniqueLocations));
  dbRuleData.locations = uniqueLocationsArray;

  return dbRuleData;
}

export async function prepareShipmentsArray(shippingRules: ShippingRules[], productIds: string[], graphql: GraphQLClient<AdminOperations>) {
  const shopifyLocations = await getShopLocations(graphql);

  productIds.forEach(async (id) => {
    const productVariantData = await getProductVariantData(id, graphql);
  });
}
