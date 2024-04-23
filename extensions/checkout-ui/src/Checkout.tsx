import {
  reactExtension,
  useShippingAddress,
  useCartLines,
  useApplyCartLinesChange,
  useApi,
  InlineStack,
  Choice,
  BlockStack,
  ChoiceList,
  Text,
  useShop,
  ToggleButtonGroup,
  InlineLayout,
  ToggleButton,
  View,
  Button
} from '@shopify/ui-extensions-react/checkout';
import {useEffect, useState} from "react";

export default reactExtension(
  'purchase.checkout.shipping-option-list.render-after',
  () => <Extension />,
);

function Extension() {
  const APP_URL = 'https://steady-harvard-around-manufacturing.trycloudflare.com';

  const { query } = useApi();
  const { myshopifyDomain } = useShop();
  const lines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const { zip } = useShippingAddress();
  console.log(lines)

  const [shipments, setShipments] = useState<any[]>([]);
  const [deliveryProduct, setDeliveryProduct] = useState<any>(null);
  const [selectedButton, setSelectedButton] = useState<string>(null);
  const [shipmentChoice, setShipmentChoice] = useState<string>('none');

  const haveLtl = shipments.some((shipment) => shipment.isLtl);

  useEffect(() => {
    if (!deliveryProduct) {
      query(`
        query getProducts($first: Int, $query: String) {
          products(first: $first, query: $query) {
            edges {
              node {
                id
                title
                variants(first: 4) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                      }
                      compareAtPrice {
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        }` as string,
        {
          variables: {
            first: 1,
            query: "title:LTL Delivery Type"
          }
        }
      ).then((res) => {
        console.log(res)
        const product = res.data.products.edges[0].node;
        setDeliveryProduct(product);
      });
    }
  }, [deliveryProduct]);

  useEffect(() => {
    if (zip) {
      getShipmentData(zip);
    }
  }, [zip])

  useEffect(() => {
    if (shipments.length) {
      const addedProducts = [];
      const shipmentsArray = [...shipments];
      shipmentsArray.forEach((shipment, index) => {
        if (shipment.containsFreightItem && !shipment.freightItemAdded) {
          addProduct(shipment.containsFreightItem);
          shipmentsArray[index].freightItemAdded = true;
          addedProducts.push(shipment.containsFreightItem);
        }
      });

      if (addedProducts.length) {
        setShipments(shipmentsArray);
      }
    }

  }, [shipments]);

  const getShipmentData = async (zip: string) => {
    const lineItems = lines.map((line) => {
      return {
        id: line.merchandise.id,
        quantity: line.quantity
      }
    });

    const data = await fetch(`${APP_URL}/app/check-rules?_data=routes/app.check-rules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ zip, lineItems, shop: myshopifyDomain }),
    })
    const { shipments } = await data.json();
    console.log(shipments);

    await Promise.all(lines.map(async (line) => {
      const shipment = shipments.find((shipment) => {
        return shipment.lineItems.some((item) => item.id === line.merchandise.id);
      });
      if (shipment) {
        const res = await applyCartLinesChange({
          type: 'updateCartLine',
          id: line.id,
          attributes: [{
            key: 'Parcel',
            value: `${shipment.etaDaysSmallParcelLow} - ${shipment.etaDaysSmallParcelHigh} days`
          }, {
            key: 'LTL',
            value: `${shipment.etaFreightLow} - ${shipment.etaFreightHigh} days`
          }]
        });
        console.log(res);
      }
    }));


    setShipments(shipments);
  }

  const addProduct = (productId: string) => {
    applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: productId,
      quantity: 1,
    }).then((res) => {
      console.log(res);
    })
  }

  //**TO_DO**//
  // handle adding product to shipment group in order list (need to decide the approach of task)
  const handleConfirm = () => {
    const shipmentsArray = [...shipments];
    const index = Number(selectedButton.split('-')[1]);
    addProduct(shipmentChoice);
    shipmentsArray[index].ltl_delivery_product_picked = true;
    setShipments(shipmentsArray);
    setSelectedButton(null);
  }

  return (
    !haveLtl && (
      <BlockStack border={"base"} cornerRadius={"base"}>
        <ToggleButtonGroup
          value={selectedButton}
          onChange={(value) => setSelectedButton(value)}
        >
          <InlineLayout spacing="base">
            {shipments.map((shipment, index) => (
              <ToggleButton
                id={`toggleBtn-${index}`}
                key={`toggleBtn-${index}`}
                disabled={shipment.ltl_delivery_product_picked}
              >
                <View
                  blockAlignment="center"
                  inlineAlignment="center"
                  minBlockSize="fill"
                >
                  {`Shipment ${index + 1}`}
                </View>
              </ToggleButton>
            ))}
          </InlineLayout>
        </ToggleButtonGroup>

        <InlineStack minInlineSize={"fill"} minBlockSize={'fill'}>
          {shipments.map((shipment, index) => (
            selectedButton === `toggleBtn-${index}` && (
              <View key={`toggleBtn-${index}`} inlineAlignment={"end"}>
                <ChoiceList
                  name="shipment"
                  variant="group"
                  value={shipmentChoice}
                  onChange={(value: string) => setShipmentChoice(value)}
                >
                  {deliveryProduct.variants.edges.map((variant, index) => (
                    <Choice id={variant.node.id} key={index} disabled={shipment.ltl_delivery_product_picked}>
                      <InlineStack spacing={"base"}>
                        <Text>{`${variant.node.title} Delivery - delivered to the outside entrance of your home or building at the ground level`}</Text>

                        <BlockStack spacing={"none"}>
                          <Text>{`Regular Price: $${variant.node.compareAtPrice.amount}`}</Text>
                          <Text>{`Discounted Price: $${variant.node.price.amount}`}</Text>
                        </BlockStack>
                      </InlineStack>
                    </Choice>
                  ))}
                </ChoiceList>

                <View padding={"base"}>
                  <Button onPress={() => handleConfirm()}>Confirm</Button>
                </View>
              </View>
            )
          ))}
        </InlineStack>
      </BlockStack>
    )
  );
}
