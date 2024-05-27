import {
  reactExtension,
  useShippingAddress,
  useCartLines,
  useApplyCartLinesChange,
  useApi,
  InlineStack,
  BlockStack,
  Text,
  useShop,
  ToggleButtonGroup,
  InlineLayout,
  ToggleButton,
  Button,
  Form,
  BlockSpacer,
  TextField,
  Icon,
  Select,
  Checkbox,
  Banner,
  useApplyAttributeChange,
  useAttributeValues,
  useBuyerJourneyIntercept,
  useExtension
} from '@shopify/ui-extensions-react/checkout';
import {useEffect, useState} from "react";

export default reactExtension(
  'purchase.checkout.shipping-option-list.render-after',
  () => <Extension />,
);

function Extension() {
  const APP_URL = 'https://began-extract-una-valid.trycloudflare.com';

  const { rendered: { current } } = useExtension();
  const { query } = useApi();
  const { myshopifyDomain } = useShop();
  const lines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const orderAttributesChange = useApplyAttributeChange();
  const { zip } = useShippingAddress() || {};
  const zip_code_attr = useAttributeValues(['zip_code'])[0];

  const [shipments, setShipments] = useState<any[]>([]);
  const [ineligibleForLtl, setIneligibleForLtl] = useState<boolean>(true);
  const [destinationTypeForm, setDestinationTypeForm] = useState<any>({});
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<any>({});
  const [haveLtl, setHaveLtl] = useState(null);

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && haveLtl && ineligibleForLtl) {
      return {
        behavior: "block",
        reason: "Ineligible for LTL delivery",
        perform: (result) => {
          if (result.behavior === "block") {
            const errors = {...validationErrors};
            errors.ineligibleForLtl = true;
            setValidationErrors(errors);
          }
        },
      };
    }

    if (canBlockProgress && haveLtl && !formSubmitted) {
      return {
        behavior: "block",
        reason: "Please fill out the form",
        perform: (result) => {
          if (result.behavior === "block") {
            const errors = {...validationErrors};
            errors.formNotSubmitted = true;
            setValidationErrors(errors);
          }
        },
      };
    }

    return {
      behavior: "allow",
      perform: () => {
        setValidationErrors({});
      },
    };
  });

  useEffect(() => {
    const checkForLtl = async (lines) => {
      const products: any = await query(
        `
        query getProductsByIds($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              title
              tags
            }
          }
        }`,
        {
          variables: {
            ids: lines.map((line) => line.merchandise.product.id)
          }
        }
      );

      if (!products.data || !products.data.nodes.length) {
        return false;
      }

      return products.data.nodes.some((product) => product.tags.includes('ltl'));
    };

    const fetchData = async () => {
      try {
        const result = await checkForLtl(lines);
        setHaveLtl(result);
      } catch (error) {
        console.error('Error fetching LTL data:', error);
        setHaveLtl(false);
      }
    };

    if (!current) {
      fetchData();
    }
  }, [lines, current]);

  useEffect(() => {
    if (zip && !current) {
      if (zip_code_attr && zip_code_attr !== zip) {
        resetOrderChanges().then(() => {
          getShipmentData(zip);
        });
      } else {
        getShipmentData(zip);
      }
    }
  }, [zip, current])

  useEffect(() => {
    const processShipments = async () => {
      if (shipments.length) {
        const isEligibleForLtl = shipments.some((shipment) => shipment.ineligibleForLtl);

        if (isEligibleForLtl && !ineligibleForLtl) {
          setIneligibleForLtl(true);
          return;
        }

        const deliveryTypes = [];

        await Promise.allSettled(lines.map(async (line) => {
          let shippingGroup = 0;

          const shipment = shipments.find((shipment, index) => {
            if (shipment.lineItems.some((item) => item.id === line.merchandise.id)) {
              shippingGroup = index;
              return true;
            }
            return false;
          });

          if (shipment) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await retryApplyCartLinesChange(line, shipment, shippingGroup);
          }
        }));

        for (let index = 0; index < shipments.length; index++) {
          const shipment = shipments[index];

          if (shipment.containsFreightItem && !shipment.freightItemAdded) {
            await addProduct(shipment.containsFreightItem, index);
          }

          deliveryTypes.push(...shipment.deliveryTypes);
        }

        const uniqueDeliveryTypes = Array.from(new Set(deliveryTypes));

        const availableDeliveryMethods = {
          'Standard': false,
          'Premium': false,
          'Enhanced': false,
          'White-glove': false
        };

        for (const method of uniqueDeliveryTypes) {
          if (availableDeliveryMethods.hasOwnProperty(method)) {
            availableDeliveryMethods[method] = true;
          }
        }

        if (Object.values(availableDeliveryMethods).some(value => value === false)) {
          await addDisableDeliveryMethodsAttribute(availableDeliveryMethods);
        }
      }
    }

    processShipments();
  }, [shipments]);

  if (!zip) {
    return null;
  }

  const retryApplyCartLinesChange = async (line, shipment, shippingGroup, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await applyCartLinesChange({
          type: 'updateCartLine',
          id: line.id,
          attributes: [
            {
              key: 'ETA',
              value: `${countDeliveryDateFromToday(shipment)}`
            },
            // {
            //   key: '_shipping_group',
            //   value: `${shippingGroup + 1}`
            // }
          ]
        });

        console.log("Applied cart line change")
        return;
      } catch (error) {
        console.log("Error applying cart line change", error.message);
        if (error.message.includes("Negotiation was stale") && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
  };

  const addDisableDeliveryMethodsAttribute = async (methods) => {
    try {
      console.log('METHODS', methods)
      const disableMethodRequest = await applyCartLinesChange({
        type: 'updateCartLine',
        id: lines[0].id,
        attributes: [
          ...lines[0].attributes,
          {
            key: '_disable_methods',
            value: `${Object.keys(methods).filter((method) => !methods[method]).join(', ')}`
          }
        ]
      });

      console.log('DISABLE METHOD REQUEST', disableMethodRequest);
    } catch (error) {
      console.error('Error adding disable delivery methods attribute', error);
    }
  };

  const resetOrderChanges = async () => {
    const cachedLinesIds = lines
      .filter((line) => line.merchandise.title.includes('Extended Area Delivery'))
      .map((line) => line.id);

    const removeProducts = await Promise.all(cachedLinesIds.map( async (lineId) => {
      const retries = 3;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await applyCartLinesChange({
            type: 'removeCartLine',
            id: lineId,
            quantity: 1
          });

          console.log("cart line removed")
          return;
        } catch (error) {
          console.log("Error applying cart line change", error.message);
          if (error.message.includes("Negotiation was stale") && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }
    }));

    console.log('REMOVE PRODUCTS',removeProducts);
  };

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
    console.log('LINE ITEMS', lineItems);

    const data = await fetch(`${APP_URL}/app/check-rules?_data=routes/app.check-rules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zip, lineItems, shop: myshopifyDomain }),
    });
    const { shipments } = await data.json();
    console.log('SHIPMENTS', shipments);

    await orderAttributesChange({
      key: 'zip_code',
      type: 'updateAttribute',
      value: zip
    });

    if (!shipments || !shipments.length) {
      return;
    }

    setShipments(shipments);
  }

  const addProduct = async (productId: string, index: number) => {
    const retries = 2;

    for (let attempt = 1; attempt <= retries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const addProduct = await applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: productId,
        quantity: 1,
        // attributes: [
        //   {
        //     key: '_shipping_group',
        //     value: `${index + 1}`
        //   }
        // ]
      })

      if (addProduct.type === 'error') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      console.log("Applied cart line change")
      return;
    }
  }

  const handleFormChange = (type: string, value: string) => {
    if (type === 'destinationType') {
      setDestinationTypeForm({
        [type]: value
      });
    }
    setDestinationTypeForm({
      ...destinationTypeForm,
      [type]: value
    });
  };

  const disableSubmitButton = () => {
    if (destinationTypeForm.destinationType === 'house') {
      return !destinationTypeForm.confirm
        || destinationTypeForm.confirm === 'false'
        || (destinationTypeForm.houseStairs === 'yes'
          && !destinationTypeForm.moreThanTwentyOneStairs)
        || (destinationTypeForm.moreThanTwentyOneStairs === 'yes'
          && !destinationTypeForm.numberOfStairs);
    }

    if (destinationTypeForm.destinationType === 'apartment' || destinationTypeForm.destinationType === 'office') {
      return !destinationTypeForm.confirm === true
        || destinationTypeForm.confirm === 'false'
        || (destinationTypeForm.stairsOrElevator === 'stairs'
          && !destinationTypeForm.numberOfStairs)
        || (destinationTypeForm.stairsOrElevator === 'elevator'
          && !destinationTypeForm.elevatorAccommodate)
        || !destinationTypeForm.certificateInsurance;
    }

    return !destinationTypeForm.destinationType;
  }

  const submitForm = async () => {
    for (const key in destinationTypeForm) {
      const retries = 3;

      try {
        await orderAttributesChange({
          key: key,
          type: 'updateAttribute',
          value: destinationTypeForm[key]
        });

        console.log('Attribute updated', key, destinationTypeForm[key])
      } catch (error) {
        console.error('Error updating attribute', key, destinationTypeForm[key], error);

        if (error.message.includes("Negotiation was stale") && retries <= 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));

          await orderAttributesChange({
            key: key,
            type: 'updateAttribute',
            value: destinationTypeForm[key]
          });
        }
      }
    }

    setFormSubmitted(true);
  };

  return (
    haveLtl && !ineligibleForLtl && (
      <BlockStack border={"base"} borderWidth={"medium"} cornerRadius={"base"} padding={"base"}>
        {Object.keys(validationErrors).length ? (<Banner
          status="critical"
          title="Oops! It looks like you are not eligible for LTL delivery."
        />
        ) : (
          <>
            <Form
              onSubmit={() =>
                console.log('onSubmit event')
              }
            >
              <BlockStack spacing={"base"}>
                <Text size={"large"}>Choose a destination type</Text>
                <ToggleButtonGroup
                  value={destinationTypeForm.destinationType || 'none'}
                  onChange={(value) => handleFormChange('destinationType', value)}
                  disabled={formSubmitted}
                >
                  <InlineLayout spacing="base" >
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
              </BlockStack>

              {validationErrors.formNotSubmitted && (
                <Banner
                  status={"critical"}
                  title={"Please fill out the form before proceeding"}
                />
              )}

              <BlockSpacer spacing="base" />

              {destinationTypeForm.destinationType === 'house' && (
                <BlockStack>
                  <Select
                    label={"Will delivery require the use of stairs?"}
                    value={destinationTypeForm.houseStairs || 'no'}
                    options={[
                      {label: "Yes", value: "yes"},
                      {label: "No", value: "no"},
                    ]}
                    onChange={(value) => handleFormChange('houseStairs', value)}
                    required
                    disabled={formSubmitted}
                  />

                  {destinationTypeForm.houseStairs === 'yes' && (
                    <Select
                      label={"Would the delivery involve carrying the item more than 21 stairs from the ground floor?"}
                      value={destinationTypeForm.moreThanTwentyOneStairs || 'no'}
                      options={[
                        {label: "Yes", value: "yes"},
                        {label: "No", value: "no"},
                      ]}
                      onChange={(value) => handleFormChange('moreThanTwentyOneStairs', value)}
                      required
                      disabled={formSubmitted}
                    />
                  )}

                  {destinationTypeForm.moreThanTwentyOneStairs === 'yes' && (
                    <TextField
                      label={"What is the total number of individual stair steps that will need to be traversed?"}
                      value={destinationTypeForm.numberOfStairs || ''}
                      onChange={(value) => handleFormChange('numberOfStairs', value)}
                      required
                      disabled={formSubmitted}
                    />
                  )}

                  <Checkbox
                    id={"confirm"}
                    name={"confirm"}
                    onChange={(value) => handleFormChange('confirm', String(value))}
                    disabled={formSubmitted}
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
                    required
                    disabled={formSubmitted}
                  />

                  {destinationTypeForm.stairsOrElevator === 'stairs' && (
                    <TextField
                      label={"What is the total number of individual stair steps that will need to be traversed?"}
                      value={destinationTypeForm.numberOfStairs || ''}
                      onChange={(value) => handleFormChange('numberOfStairs', value)}
                      required
                      disabled={formSubmitted}
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
                      required
                      disabled={formSubmitted}
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
                    required
                    disabled={formSubmitted}
                  />

                  <Checkbox
                    id={"confirm"}
                    name={"confirm"}
                    onChange={(value) => handleFormChange('confirm', String(value))}
                    disabled={formSubmitted}
                  >
                    Please confirm that you have measured the entrance and all elevator/doorways for adequate fit
                  </Checkbox>
                </BlockStack>
              )}

              <BlockSpacer spacing="base" />

              <InlineStack inlineAlignment={"end"}>
                {!formSubmitted
                  ? (
                    <Button accessibilityRole="submit" onPress={() => submitForm()} disabled={disableSubmitButton()}>
                      Submit
                    </Button>
                  )
                  : (
                    <Button kind={"secondary"} accessibilityRole="submit" onPress={() => setFormSubmitted(false)}>
                      Edit
                    </Button>
                  )}
              </InlineStack>
            </Form>
          </>
        )}
      </BlockStack>
    )
  );
}
