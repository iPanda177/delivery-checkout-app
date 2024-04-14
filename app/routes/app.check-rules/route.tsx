import {type ActionFunctionArgs, json} from "@remix-run/node";
import db from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = await request.json();
    const { zip } = body;

    const shippingRule = await prisma.shippingRules.findFirst({
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

    if (shippingRule && shippingRule.addOnProductId) {
      return json({ productId: shippingRule.addOnProductId }, { status: 200 });
    }

    return json({ error: "No product found" }, { status: 404 });
  } catch (err) {
    console.log(err)
    return json({ err }, { status: 404 });
  }
}
