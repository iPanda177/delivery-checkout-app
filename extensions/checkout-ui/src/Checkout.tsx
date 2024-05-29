import {
  reactExtension,
  useShippingAddress,
  useCartLines,
  useApplyCartLinesChange,
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
  useExtension,
  useApi, useCheckoutToken,
} from '@shopify/ui-extensions-react/checkout';
import {useEffect, useReducer} from "react";

export default reactExtension(
  'purchase.checkout.shipping-option-list.render-after',
  () => <Extension />,
);

const initialState = {
  shipments: [],
  ineligibleForLtl: false,
  destinationTypeForm: {},
  formLoading: false,
  formSubmitted: false,
  validationErrors: {},
  haveLtl: null
};
function reducer(state, action) {
  switch (action.type) {
    case 'SET_SHIPMENTS':
      return { ...state, shipments: action.payload };
    case 'SET_INELIGIBLE_FOR_LTL':
      return { ...state, ineligibleForLtl: action.payload };
    case 'SET_DESTINATION_TYPE_FORM':
      return { ...state, destinationTypeForm: action.payload };
    case 'SET_FORM_LOADING':
      return { ...state, formLoading: action.payload };
    case 'SET_FORM_SUBMITTED':
      return { ...state, formSubmitted: action.payload, formLoading: false };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload };
    case 'SET_HAVE_LTL':
      return { ...state, haveLtl: action.payload };
    default:
      return state;
  }
}

function Extension() {
  const APP_URL = 'https://cos-meaning-discretion-military.trycloudflare.com';

  const { rendered: { current } } = useExtension();
  const { query } = useApi();
  const { myshopifyDomain } = useShop();
  const lines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const orderAttributesChange = useApplyAttributeChange();
  const { zip } = useShippingAddress();
  const zip_code_attr = useAttributeValues(['zip_code'])[0];
  // const cart_id = useAttributeValues(['cart_id'])[0];
  const token = useCheckoutToken();
  console.log(lines)
  // console.log(cart_id)
  console.log('TOKEN', token)

  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    shipments,
    ineligibleForLtl,
    destinationTypeForm,
    formLoading,
    formSubmitted,
    validationErrors,
    haveLtl
  } = state;

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && haveLtl && ineligibleForLtl) {
      return {
        behavior: "block",
        reason: "Ineligible for LTL delivery",
        perform: (result) => {
          if (result.behavior === "block") {
            const errors = {...validationErrors};
            errors.ineligibleForLtl = true;
            dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
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
            dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
          }
        },
      };
    }

    return {
      behavior: "allow",
      perform: () => {
        dispatch({ type: 'SET_VALIDATION_ERRORS', payload: {} });
      },
    };
  });

  useEffect(() => {
    if (zip) {
      if (zip_code_attr && zip_code_attr !== zip) {
        // resetOrderChanges().then(() => {
        //   getShipmentData(zip);
        // });
      } else {
        getShipmentData(zip);
      }
    }

  }, [zip])

  useEffect(() => {
    const processShipments = async () => {
      if (shipments.length) {
        const haveLtl = shipments.some((shipment) => shipment.isLtl);

        if (haveLtl !== state.haveLtl) {
          dispatch({ type: 'SET_HAVE_LTL', payload: haveLtl });
        }

        const isIneligibleForLtl = shipments.some((shipment) => shipment.ineligibleForLtl);

        if (isIneligibleForLtl !== ineligibleForLtl) {
          dispatch({ type: 'SET_INELIGIBLE_FOR_LTL', payload: isIneligibleForLtl });
        }

        const deliveryTypes: string[] = shipments.reduce((acc, shipment) => [...acc, ...shipment.deliveryTypes], []);

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

        let disableMethodsAttribute = null;

        if (Object.values(availableDeliveryMethods).some(value => value === false)) {
          disableMethodsAttribute = {
            key: '_disable_methods',
            value: `${Object.keys(availableDeliveryMethods).filter((method) => !availableDeliveryMethods[method]).join(', ')}`
          }
        }

        await Promise.allSettled(lines.map(async (line) => {
          let shippingGroup = 0;

          const shipment = shipments.find((shipment, index) => {
            if (shipment.lineItems.some((item) => item.id === line.merchandise.id)) {
              shippingGroup = index;
              return true;
            }
            return false;
          });

          if (shipment && current) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await retryApplyCartLinesChange(line, shipment, shippingGroup, disableMethodsAttribute);
          }
        }));

        if (current) {
          for (let index = 0; index < shipments.length; index++) {
            const shipment = shipments[index];

            if (shipment.containsFreightItem && !shipment.freightItemAdded) {
              await addProduct(shipment.containsFreightItem, index);
            }
          }
        }
      }
    }

    processShipments();
  }, [shipments]);

  const retryApplyCartLinesChange = async (line, shipment, shippingGroup, disableMethodsAttribute, retries = 3) => {
    const attributes = [
      {
        key: 'ETA',
        value: `${countDeliveryDateFromToday(shipment)}`
      },
      {
        key: '_shipping_group',
        value: `${shippingGroup + 1}`
      },
    ];

    if (disableMethodsAttribute) {
      attributes.push(disableMethodsAttribute);
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const applyCartLines = await applyCartLinesChange({
          type: 'updateCartLine',
          id: line.id,
          attributes: [...attributes]
        });


        if (applyCartLines.type === 'error') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        return;
      } catch (error) {
        if (error.message.includes("Negotiation was stale") && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
  };

  const resetOrderChanges = async () => {
    const cachedLines = lines
      .filter((line) => line.merchandise.title.includes('Extended Area Delivery') || line.lineComponents.length)
      .map((line) => {
        return {
          id: line.id,
          quantity: line.quantity
        }
      });
    console.log('cachedLinesIds', cachedLines)

    const shippingGroupsProducts = lines
      .filter((line) => line.lineComponents.length)
      .reduce((acc, line) => {
        const filteredLineComponents = line.lineComponents
          .filter((component) => !component.merchandise.title.includes('Extended Area Delivery'));

        return [...acc, ...filteredLineComponents];
      }, []);

    console.log('shippingGroupsProducts', shippingGroupsProducts)

    const resetCart = await query(`
      mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,{
        variables: {
          cartId: `gid://shopify/Cart/${token}`,
          lineIds: []
        }
      }
    )

    console.log('resetCart', resetCart)

    // for (const line of cachedLines) {
    //   const retries = 3;
    //
    //   for (let attempt = 1; attempt <= retries; attempt++) {
    //     try {
    //       const removingCartLine = await applyCartLinesChange({
    //         type: 'removeCartLine',
    //         id: line.id,
    //         quantity: line.quantity
    //       });
    //
    //       console.log('removingCartLine', removingCartLine)
    //
    //       if (removingCartLine.type === 'error') {
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //         continue;
    //       }
    //
    //       return;
    //     } catch (error) {
    //       if (error.message.includes("Negotiation was stale") && attempt < retries) {
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //       } else {
    //         throw error;
    //       }
    //     }
    //   }
    // }

    await Promise.all(shippingGroupsProducts.map(async (line) => {
      const retries = 3;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const addCartLine = await applyCartLinesChange({
            type: 'addCartLine',
            merchandiseId: line.merchandise.id,
            quantity: line.quantity,
            attributes: [...line.attributes]
          });

          if (addCartLine.type === 'error') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          return;
        } catch (error) {
          if (error.message.includes("Negotiation was stale") && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }
    }));
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

    const data = await fetch(`${APP_URL}/app/check-rules?_data=routes/app.check-rules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zip, lineItems, shop: myshopifyDomain }),
    });
    const { shipments } = await data.json();

    await orderAttributesChange({
      key: 'zip_code',
      type: 'updateAttribute',
      value: zip
    });

    if (!shipments || !shipments.length) {
      return;
    }

    dispatch({ type: 'SET_SHIPMENTS', payload: shipments });
  }

  const addProduct = async (productId: string, index: number) => {
    const retries = 2;

    for (let attempt = 1; attempt <= retries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const addProduct = await applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: productId,
        quantity: 1,
        attributes: [
          {
            key: '_shipping_group',
            value: `${index + 1}`
          }
        ]
      })

      if (addProduct.type === 'error') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      return;
    }
  }

  const handleFormChange = (type: string, value: string) => {
    if (type === 'destinationType') {
      dispatch({ type: 'SET_DESTINATION_TYPE_FORM', payload: { [type]: value } })
    }

    dispatch({ type: 'SET_DESTINATION_TYPE_FORM', payload: { ...destinationTypeForm, [type]: value }})
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
    dispatch({ type: 'SET_FORM_LOADING', payload: true })

    for (const key in destinationTypeForm) {
      const retries = 3;

      try {
        await orderAttributesChange({
          key: key,
          type: 'updateAttribute',
          value: destinationTypeForm[key]
        });

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

    dispatch({ type: 'SET_FORM_SUBMITTED', payload: true })
  };

  if (haveLtl && ineligibleForLtl) {
    return (
      <BlockStack border={"base"} borderWidth={"medium"} cornerRadius={"base"} padding={"base"}>
        <Banner
          status="critical"
          title="Oops! It looks like you are not eligible for LTL delivery."
        />
      </BlockStack>
    )
  }

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
              onSubmit={() => console.log('onSubmit event')}
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
                    <Button loading={formLoading} accessibilityRole="submit" onPress={() => submitForm()} disabled={disableSubmitButton()}>
                      Submit
                    </Button>
                  )
                  : (
                    <Button kind={"secondary"} accessibilityRole="submit" onPress={() => dispatch({ type: 'SET_FORM_SUBMITTED', payload: false })}>
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
