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
  Button,
  Form,
  BlockSpacer,
  TextField,
  Icon,
  Select,
  Checkbox,
  Banner,
  useApplyAttributeChange
} from '@shopify/ui-extensions-react/checkout';
import {useEffect, useState} from "react";

export default reactExtension(
  'purchase.checkout.shipping-option-list.render-after',
  () => <Extension />,
);

function Extension() {
  const APP_URL = 'https://prophet-pacific-fitted-bathrooms.trycloudflare.com';

  const { query } = useApi();
  const { myshopifyDomain } = useShop();
  const lines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const orderAttributesChange = useApplyAttributeChange();
  const { zip } = useShippingAddress();
  console.log(lines)

  const [shipments, setShipments] = useState<any[]>([]);
  const [deliveryProduct, setDeliveryProduct] = useState<any>(null);
  const [selectedButton, setSelectedButton] = useState<string>(null);
  const [shipmentChoice, setShipmentChoice] = useState<string>('none');
  const [destinationTypeForm, setDestinationTypeForm] = useState<any>({});

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

  const countDeliveryDateFromToday = (shipment) => {
    const etaLow = shipment.isLtl ? shipment.etaFreightLow : shipment.etaSmallParcelLow;
    const etaHigh = shipment.isLtl ? shipment.etaFreightHigh : shipment.etaSmallParcelHigh;
    const today = new Date();
    const etaLowDate = new Date(today);
    etaLowDate.setDate(today.getDate() + etaLow);
    const etaHighDate = new Date(today);
    etaHighDate.setDate(today.getDate() + etaHigh);
    return `${etaLowDate.getDate()} ${etaLowDate.toLocaleString('default', { month: 'long' })} - ${etaHighDate.getDate()} ${etaHighDate.toLocaleString('default', { month: 'long' })}`;
  };

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
            key: 'ETA',
            value: `${countDeliveryDateFromToday(shipment)}`
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

  const handleFormChange = (type: string, value: string) => {
    setDestinationTypeForm({
      ...destinationTypeForm,
      [type]: value
    });
  };

  const submitForm = () => {
    for (const key in destinationTypeForm) {
      orderAttributesChange({
        key: key,
        type: 'updateAttribute',
        value: destinationTypeForm[key]
      });
    }
  };

  return (
    !haveLtl && (
      <BlockStack>
        <Form
          onSubmit={() =>
            console.log('onSubmit event')
          }
        >
          <ToggleButtonGroup
            value={destinationTypeForm.destinationType || 'none'}
            onChange={(value) => handleFormChange('destinationType', value)}
          >
            <InlineLayout spacing="base">
              <ToggleButton
                id={`house`}
              >
                <BlockStack inlineAlignment={"center"}>
                  <Icon size={"large"} source={"delivered"} />
                  <Text>House</Text>
                </BlockStack>
              </ToggleButton>

              <ToggleButton
                id={`apartment`}
              >
                <BlockStack inlineAlignment={"center"}>
                  <Icon size={"large"} source={"store"} />
                  <Text>Apartment</Text>
                </BlockStack>
              </ToggleButton>

              <ToggleButton
                id={`office`}
              >
                <BlockStack inlineAlignment={"center"}>
                  <Icon size={"large"} source={"store"} />
                  <Text>Commercial/Office</Text>
                </BlockStack>
              </ToggleButton>
            </InlineLayout>
          </ToggleButtonGroup>

          <BlockSpacer spacing="base" />

          {destinationTypeForm.destinationType === 'house' && (
            <BlockStack>
              <Select
                label={"Will delivery require the use of stairs?"}
                value={destinationTypeForm.houseStairs || 'none'}
                options={[
                  {label: "Yes", value: "yes"},
                  {label: "No", value: "no"},
                ]}
                onChange={(value) => handleFormChange('houseStairs', value)}
              />

              {destinationTypeForm.stairsOrElevator === 'yes' && (
                <Select
                  label={"Would the delivery involve carrying the item more than 21 stairs from the ground floor?"}
                  value={destinationTypeForm.moreThanTwentyOneStairs || 'none'}
                  options={[
                    {label: "Yes", value: "yes"},
                    {label: "No", value: "no"},
                  ]}
                  onChange={(value) => handleFormChange('moreThanTwentyOneStairs', value)}
                />
              )}

              {destinationTypeForm.moreThanTwentyOneStairs === 'yes' && (
                <TextField
                  label={"What is the total number of individual stair steps that will need to be traversed?"}
                  value={destinationTypeForm.numberOfStairs || ''}
                  onChange={(value) => handleFormChange('numberOfStairs', value)}
                />
              )}

              <Checkbox
                id={"confirm"}
                name={"confirm"}
                onChange={(value) => handleFormChange('confirm', String(value))}
              >
                Please confirm that you have measured the entrance and all elevator/doorways for adequate fit
              </Checkbox>
            </BlockStack>
          )}

          {(destinationTypeForm.destinationType === 'apartment' || destinationTypeForm.destinationType === 'office') && (
            <BlockStack>
              <Banner
                status={"warning"}
                title={"For Apartment and Office Deliveries that are not on the ground floor, we suggest upgrading to Enhanced Delivery to ensure there are no restrictions imposed by the Freight Courier on your delivery"}
              />

              <Select
                label={"Will delivery require the use of stairs or elevator?"}
                value={destinationTypeForm.stairsOrElevator || 'none'}
                options={[
                  {label: "Requires use of Stairs", value: "stairs"},
                  {label: "Requires use of Elevator", value: "elevator"},
                  {label: "None Needed (Ground Level)", value: "none"}
                ]}
                onChange={(value) => handleFormChange('stairsOrElevator', value)}
              />

              {destinationTypeForm.stairsOrElevator === 'stairs' && (
                <TextField
                  label={"What is the total number of individual stair steps that will need to be traversed?"}
                  value={destinationTypeForm.numberOfStairs || ''}
                  onChange={(value) => handleFormChange('numberOfStairs', value)}
                />
              )}

              {destinationTypeForm.stairsOrElevator === 'elevator' && (
                <Select
                  label={
                    destinationTypeForm.destinationType === 'apartment'
                      ? "Is the elevator large enough to accommodate the delivery (i.e. Freight Elevator)?"
                      :  "Does the building / location have a delivery dock and/or freight elevator for Deliveries?"
                }
                  value={destinationTypeForm.elevatorAccommodate || 'none'}
                  options={[
                    {label: "Yes", value: "yes"},
                    {label: "No", value: "no"}
                  ]}
                  onChange={(value) => handleFormChange('elevatorAccommodate', value)}
                />
              )}

              <Select
                label={"Does your building or unit require a Certificate of Insurance (COI) for delivery?"}
                value={destinationTypeForm.certificateInsurance || 'none'}
                options={[
                  {label: "Yes", value: "yes"},
                  {label: "No", value: "no"}
                ]}
                onChange={(value) => handleFormChange('certificateInsurance', value)}
              />

              <Checkbox
                id={"confirm"}
                name={"confirm"}
                onChange={(value) => handleFormChange('confirm', String(value))}
              >
                Please confirm that you have measured the entrance and all elevator/doorways for adequate fit
              </Checkbox>
            </BlockStack>
          )}

          <BlockSpacer spacing="base" />

          <Button accessibilityRole="submit" onPress={() => submitForm()}>
            Submit
          </Button>
        </Form>

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
      </BlockStack>
    )
  );
}
