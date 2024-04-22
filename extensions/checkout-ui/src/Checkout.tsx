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
  Icon, Text, useShop, ToggleButtonGroup, InlineLayout, ToggleButton, View, Button
} from '@shopify/ui-extensions-react/checkout';
import {useEffect, useState} from "react";

export default reactExtension(
  'purchase.checkout.shipping-option-list.render-after',
  () => <Extension />,
);

function Extension() {
  const APP_URL = 'https://suffered-myself-sin-js.trycloudflare.com';

  const { query } = useApi();
  const { myshopifyDomain } = useShop();
  const lines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const { zip } = useShippingAddress();

  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedButton, setSelectedButton] = useState<string>('none');
  const [shipmentChoice, setShipmentChoice] = useState<string>('front-door');

  const haveLtl = shipments.some((shipment) => shipment.isLtl);

  useEffect(() => {
    if (zip) {
      getShipmentData(zip);
    }
  }, [zip])

  useEffect(() => {
    if (shipments.length) {
      const shipmentsArray = [...shipments];
      shipmentsArray.forEach((shipment, index) => {
        if (shipment.containsFreightItem && !shipment.freightItemAdded) {
          addProduct(shipment.containsFreightItem);
          shipmentsArray[index].freightItemAdded = true;
        }
      });

      // setShipments(shipmentsArray);
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
  const handleConfirm = () => {
    // write confirmation function for adding an extra product
    // Ask Andrew to add this products
  }

  return (
    !haveLtl && (
      <BlockStack>
        <ToggleButtonGroup
          value={selectedButton}
          onChange={(value) => setSelectedButton(value)}
        >
          <InlineLayout spacing="base">
            {shipments.map((shipment, index) => (
              <ToggleButton id={`toggleBtn-${index}`} key={`toggleBtn-${index}`}>
                <View
                  blockAlignment="center"
                  inlineAlignment="center"
                  minBlockSize="fill"
                >
                  {`Shipment ${index + 1} - ${shipment.lineItems.length} items`}
                </View>
              </ToggleButton>
            ))}
          </InlineLayout>
        </ToggleButtonGroup>

        <InlineStack minInlineSize={"fill"} minBlockSize={'fill'} inlineAlignment={"end"}>
          <ChoiceList
            name="shipment"
            variant="group"
            value={shipmentChoice}
            onChange={(value: string) => setShipmentChoice(value)}
          >
            <Choice
              secondaryContent={
                <Icon source="truck" />
              }
              id="front-door"
            >
              <InlineStack spacing={"base"}>
                <Text>Front Door Delivery - delivered to the outside entrance of your home or building at the ground level</Text>

                <BlockStack spacing={"none"}>
                  <Text>Regular Price: $99</Text>
                  <Text>Discounted Price: Free</Text>
                </BlockStack>
              </InlineStack>
            </Choice>

            <Choice
              secondaryContent={
                <Icon source="delivery" />
              }
              id="enhanced-delivery"
            >
              <InlineStack spacing={"base"}>
                <Text>Enhanced Delivery - delivered to your room of choice on any floor</Text>

                <BlockStack spacing={"none"}>
                  <Text>Regular Price: $179</Text>
                  <Text>Discounted Price: $79</Text>
                </BlockStack>
              </InlineStack>
            </Choice>

            <Choice
              secondaryContent={
                <Icon source="delivered" />
              }
              id="premium-delivery"
            >
              <InlineStack spacing={"base"}>
                <Text>Premium Delivery - includes Enhanced Delivery & item setup</Text>

                <BlockStack spacing={"none"}>
                  <Text>Regular Price: $229</Text>
                  <Text>Discounted Price: $129</Text>
                </BlockStack>
              </InlineStack>
            </Choice>

            <Choice
              secondaryContent={
                <Icon source="return" />
              }
              id="white-glove-delivery"
            >
              <InlineStack spacing={"base"}>
                <Text>White Glove Delivery - includes Premium Delivery & packaging removal</Text>

                <BlockStack spacing={"none"}>
                  <Text>Regular Price: $299</Text>
                  <Text>Discounted Price: $199</Text>
                </BlockStack>
              </InlineStack>
            </Choice>
          </ChoiceList>

          <Button onPress={() => handleConfirm()}>Confirm</Button>
        </InlineStack>
      </BlockStack>
    )
  );
}
