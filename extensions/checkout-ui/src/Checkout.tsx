import {
  reactExtension,
  useShippingAddress,
  useCartLines,
  useApplyCartLinesChange,
  Banner,
  useApi,
  Pressable,
  InlineStack,
  Choice,
  BlockStack,
  ChoiceList,
  Icon, Text
} from '@shopify/ui-extensions-react/checkout';
import {useEffect, useState} from "react";

export default reactExtension(
  'purchase.checkout.shipping-option-list.render-after',
  () => <Extension />,
);

const mockupData = [
  {
    id: 0,
    lineItems: [],
    fulfillingLocaitonId: 'string<shopifywarehouselocation>',
    etaSmallParcelLow: '2',
    etaSmallParcelHigh: '5',
    etaFreightLow: '14',
    etaFreightHigh: '18',
    serviceType: 'String<DeliveryType>',
    containsFreightItem: true,
    freightItemQuestions: {
      destinationType: null
    }
  }
]

function Extension() {
  const APP_URL = 'https://cameron-usual-rachel-precipitation.trycloudflare.com';

  const { query } = useApi();
  const lines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const { zip } = useShippingAddress();

  const [shippingRulesState, setShippingRulesState] = useState<any>(null);
  const [productsTags, setProductsTags] = useState<any>(null);
  const [haveLTLTag, setHaveLTLTag] = useState<boolean>(false);
  const [shipmentChoice, setShipmentChoice] = useState<string>('front-door');
  console.log('update')

  useEffect(() => {
    console.log('changing')
    if (zip) {
      // checkRules(zip);
    }
  }, [zip])

  useEffect(() => {
    if (!productsTags) {
      const productTagsArray = [];

      lines.forEach((line) => {
        console.log(line);
        const productData = query(
            `#graphql
          query getProductById($id: ID!) {
            product(id: $id) {
              id
              title
              tags
            }
          }`,
          {
            variables: {
              id: line.merchandise.product.id
            }
          }
        ).then((res) => {
          console.log(res);
          if (res.data) {
            return res.data;
          }
        })

        productTagsArray.push({ ...productData, lineId: line.id});
      });

      setProductsTags(productTagsArray)
    }
  }, [productsTags]);

  const checkRules = async (zip: string) => {
    const { shippingRules } = await fetch(`${APP_URL}/app/check-rules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zip }),
    })
      .then((response) => response.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    console.log(shippingRules);

    // how to handle multiple rules products ???

    // if (shippingRule.addOnProductId && !shippingRuleState) {
    //   addProduct(shippingRule.addOnProductId);
    //   setShippingRulesState(shippingRules);
    // }
  }

  const addProduct = (productId: string) => {
    applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: productId,
      quantity: 1,
    }).then((res) => {
      console.log(res);
    })
    // lines.forEach((line) => {
    //   applyCartLinesChange({
    //     type: 'updateCartLine',
    //     id: line.id,
    //     attributes: [{
    //       // rename for zip code product id
    //       key: '_extra_product_id',
    //       value: productId
    //     }]
    //   }).then((res) => {
    //     console.log(res);
    //   })
    // })


  }

  return (
    // haveLTLTag && (
    <InlineStack minInlineSize={"fill"} minBlockSize={'fill'}>
      <ChoiceList
        name="shipment"
        variant="group"
        value={shipmentChoice}
        onChange={(value) => setShipmentChoice(value)}
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
    </InlineStack>
    // )
  );
}
