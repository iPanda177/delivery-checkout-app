import {type ActionFunctionArgs, json, type LoaderFunction} from "@remix-run/node";
// @ts-ignore
import { cors } from "remix-utils/cors";
import db from "~/db.server";
import {unauthenticated} from "~/shopify.server";
import {prepareShipmentsArray} from "~/models/Shipping.server";

export const loader: LoaderFunction = async ({ request }) => {
  const response = json({ status: "ok" }, { status: 200 });

  return await cors(request, response, { origin: true });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = await request.json();
    const { zip, lineItems, shop } = body;
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
        zipCodeRanges: true,
        locations: {
          include: {
            location: true
          }
        },
        deliveryTypes: {
          include: {
            deliveryType: true
          }
        }
      }
    });
    console.log('SHIPPING RULES', shippingRules)

    const shipments = await prepareShipmentsArray(shippingRules as any[], lineItems, admin.graphql);

    return cors(request, json({ shipments }, { status: 200 }), { origin: true });
  } catch (err) {
    console.log(err)
    return cors(request, json({ err }, { status: 404 }), { origin: true });
  }
}
