import { json } from "stream/consumers";
import db from "../db.server";

export async function getShopLocations(shop, graphql) {
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

export async function getShippingRule(id, graphql) {
  const dbRuleData = await db.shippingRules.findFirst({ where: { id } });

  if (!dbRuleData) {
    return null;
  }

  return supplementRuleData(id, graphql);
}

async function supplementRuleData(id, graphql) {}
