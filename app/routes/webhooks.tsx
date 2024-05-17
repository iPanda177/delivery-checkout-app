import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload }: any = await authenticate.webhook(
    request
  );

  if (!admin) {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    throw new Response();
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }

      break;

    case "LOCATIONS_CREATE":
      await db.location.create({
        data: {
          locationId: `gid://shopify/Location/${payload.id}`,
          locationName: payload.name,
        }
      });

    case "LOCATIONS_UPDATE":
      await db.location.update({
        where: { locationId: `gid://shopify/Location/${payload.id}` },
        data: {
          locationName: payload.name,
        }
      });


    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
