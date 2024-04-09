import db from "../db.server";
// @ts-ignore
import type {GraphQLClient} from "@shopify/shopify-app-remix/build/ts/server/clients/types";
import type {AdminOperations} from "@shopify/admin-api-client";

export async function getShopLocations(shop: string, graphql: GraphQLClient<AdminOperations>) {
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

export async function getShippingRule(id: number, graphql: GraphQLClient<AdminOperations>) {
  const dbRuleData = await db.shippingRules.findFirst({ where: { id } });

  if (!dbRuleData) {
    return null;
  }

  return dbRuleData;
}
