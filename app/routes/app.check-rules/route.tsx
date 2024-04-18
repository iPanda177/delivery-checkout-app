import {type ActionFunctionArgs, json, type LoaderFunction} from "@remix-run/node";
import { cors } from "remix-utils/cors";
import db from "~/db.server";
import {unauthenticated} from "~/shopify.server";
import {getShopLocations, prepareShipmentsArray} from "~/models/Shipping.server";

export const loader: LoaderFunction = async ({ request }) => {
  const response = json({ status: "ok" }, { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });

  return await cors(request, response, { origin: true });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = await request.json();
    const { zip, productIds, shop } = body;
    const { admin } = await unauthenticated.admin(shop);

    const shippingRules = await db.shippingRules.findMany({
      where: {
        AND: [
          {
            zipCodeRanges: {
              some: {
                zipRangeStart: {
                  lte: zip
                },
                OR: [
                  {
                    zipRangeEnd: undefined
                  },
                  {
                    zipRangeEnd: {
                      gte: zip
                    }
                  }
                ]
              }
            }
          },
          {
            OR: [
              {
                zipCodeRanges: {
                  some: {
                    zipRangeEnd: undefined
                  }
                }
              },
              {
                zipCodeRanges: {
                  some: {
                    zipRangeEnd: {
                      gte: zip
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      include: {
        zipCodeRanges: true
      }
    });

    if (!shippingRules.length) {
      return json({ error: "No shipping rules found" }, { status: 404 });
    }

    const shipmentsArray = await prepareShipmentsArray(shippingRules, productIds, admin.graphql);





    return cors(request, json({ error: "No product found" }, { status: 404 }), { origin: true });
  } catch (err) {
    console.log(err)
    return json({ err }, { status: 404 });
  }
}
