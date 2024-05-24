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
  useExtensionCapability,
  useBuyerJourneyIntercept
} from '@shopify/ui-extensions-react/checkout';
import {useEffect, useState} from "react";

export default reactExtension(
  'purchase.checkout.shipping-option-list.render-after',
  () => <Extension />,
);

function Extension() {
  const APP_URL = 'https://freebsd-contacted-ongoing-note.trycloudflare.com';

  const { query } = useApi();
  const { myshopifyDomain } = useShop();
  const lines = useCartLines();
  console.log('LINES', lines)
  const applyCartLinesChange = useApplyCartLinesChange();
  const orderAttributesChange = useApplyAttributeChange();
  const { zip } = useShippingAddress();
  const zip_code_attr = useAttributeValues(['zip_code'])[0];
  const canBlockProgress = useExtensionCapability("block_progress");
  console.log('CAN BLOCK PROGRESS', canBlockProgress)

  const [shipments, setShipments] = useState<any[]>([]);
  const [ineligibleForLtl, setIneligibleForLtl] = useState<boolean>(true);
  const [deliveryProduct, setDeliveryProduct] = useState<any>(null);
  // const [selectedButton, setSelectedButton] = useState<string>(null);
  // const [shipmentChoice, setShipmentChoice] = useState<string>('none');
  const [destinationTypeForm, setDestinationTypeForm] = useState<any>({});
  const [cachedProducts, setCachedProducts] = useState<any>([]);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  // const [ltlDeliveryProductPicked, setLTLDeliveryProductPicked] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<any>({});
  const [haveLtl, setHaveLtl] = useState(null);

  console.log('ineligibleForLtl', ineligibleForLtl)

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

    // if (canBlockProgress && haveLtl && !ltlDeliveryProductPicked) {
    //   return {
    //     behavior: "block",
    //     reason: "Please choose a delivery type",
    //     perform: (result) => {
    //       if (result.behavior === "block") {
    //         const errors = {...validationErrors};
    //         errors.ltlDeliveryProductNotPicked = true;
    //         setValidationErrors(errors);
    //       }
    //     },
    //   };
    // }

    return {
      behavior: "allow",
      perform: () => {
        setValidationErrors({});
      },
    };
  });

  useEffect(() => {
    const checkForLtl = async (lines) => {
      const products = await query(
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

      console.log(lines.map((line) => line.merchandise.product.id));

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

    fetchData();
  }, [lines]);

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
      ).then((res: any) => {
        const product = res.data.products.edges[0].node;
        setDeliveryProduct(product);
      });
    }
  }, [deliveryProduct]);

  useEffect(() => {
    if (zip) {
      if (zip_code_attr && zip_code_attr !== zip) {
        console.log('ZIP CODE CHANGED');
        resetOrderChanges().then(() => {
          console.log('RESET ORDER CHANGES');
          getShipmentData(zip);
        });
      } else {
        console.log('ZIP CODE DID NOT CHANGE')
        getShipmentData(zip);
      }
    }
  }, [zip])

  // useEffect(() => {
  //   console.log('SHIPMENTS USE EFFECT WORKS')
  //   if (shipments.length) {
  //     setIneligibleForLtl(shipments.some((shipment) => shipment.ineligibleForLtl));
  //     const addedProducts = [];
  //     const shipmentsArray = [...shipments];
  //     const deliveryTypes = [];
  //
  //     const processShipments = async () => {
  //       for (let index = 0; index < shipmentsArray.length; index++) {
  //         const shipment = shipmentsArray[index];
  //         console.log('SHIPMENT IN USE EFFECT', shipment);
  //
  //         if (shipment.containsFreightItem && !shipment.freightItemAdded) {
  //           await addProduct(shipment.containsFreightItem, index);
  //           shipmentsArray[index].freightItemAdded = true;
  //           addedProducts.push(shipment.containsFreightItem);
  //         }
  //
  //         console.log('SHIPMENT DELIVERY TYPES', shipment.deliveryTypes, shipment);
  //         deliveryTypes.push(...shipment.deliveryTypes);
  //         console.log('DELIVERY TYPES', deliveryTypes);
  //       }
  //
  //       console.log('ADDED PRODUCTS', addedProducts);
  //
  //       const uniqueDeliveryTypes = Array.from(new Set(deliveryTypes));
  //       console.log('UNIQUE DELIVERY TYPES', uniqueDeliveryTypes);
  //
  //       const availableDeliveryMethods = {
  //         'Standard': false,
  //         'Premium': false,
  //         'Enhanced': false,
  //         'White-glove': false
  //       };
  //
  //       for (const method of uniqueDeliveryTypes) {
  //         console.log('METHOD', deliveryTypes, availableDeliveryMethods);
  //         if (availableDeliveryMethods.hasOwnProperty(method)) {
  //           availableDeliveryMethods[method] = true;
  //         }
  //       }
  //
  //       console.log('AVAILABLE DELIVERY METHODS', availableDeliveryMethods);
  //
  //       if (Object.values(availableDeliveryMethods).some(value => value === false)) {
  //         await addDisableDeliveryMethodsAttribute(availableDeliveryMethods);
  //       }
  //
  //       if (addedProducts.length) {
  //         setShipments(shipmentsArray);
  //       }
  //
  //     };
  //
  //     processShipments();
  //   }
  // }, [shipments]);

  useEffect(() => {
    console.log('SHIPMENTS USE EFFECT WORKS')

    const processShipments = async () => {
      if (shipments.length) {
        setIneligibleForLtl(shipments.some((shipment) => shipment.ineligibleForLtl));
        const addedProducts = [];
        const shipmentsArray = [...shipments];
        const deliveryTypes = [];

        await Promise.all(lines.map(async (line) => {
          let shippingGroup = 0;

          const shipment = shipments.find((shipment, index) => {
            if (shipment.lineItems.some((item) => item.id === line.merchandise.id)) {
              shippingGroup = index;
              return true;
            }
            return false;
          });

          console.log('---SHIPMENT', shipment);

          if (shipment) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await retryApplyCartLinesChange(line, shipment, shippingGroup);
          }
        }));


        for (let index = 0; index < shipmentsArray.length; index++) {
          const shipment = shipmentsArray[index];
          console.log('SHIPMENT IN USE EFFECT', shipment);

          if (shipment.containsFreightItem && !shipment.freightItemAdded) {
            await addProduct(shipment.containsFreightItem, index);
            shipmentsArray[index].freightItemAdded = true;
            addedProducts.push(shipment.containsFreightItem);
          }

          console.log('SHIPMENT DELIVERY TYPES', shipment.deliveryTypes, shipment);
          deliveryTypes.push(...shipment.deliveryTypes);
          console.log('DELIVERY TYPES', deliveryTypes);
        }

        console.log('ADDED PRODUCTS', addedProducts);

        const uniqueDeliveryTypes = Array.from(new Set(deliveryTypes));
        console.log('UNIQUE DELIVERY TYPES', uniqueDeliveryTypes);

        const availableDeliveryMethods = {
          'Standard': false,
          'Premium': false,
          'Enhanced': false,
          'White-glove': false
        };

        for (const method of uniqueDeliveryTypes) {
          console.log('METHOD', deliveryTypes, availableDeliveryMethods);
          if (availableDeliveryMethods.hasOwnProperty(method)) {
            availableDeliveryMethods[method] = true;
          }
        }

        console.log('AVAILABLE DELIVERY METHODS', availableDeliveryMethods);

        if (Object.values(availableDeliveryMethods).some(value => value === false)) {
          await addDisableDeliveryMethodsAttribute(availableDeliveryMethods);
        }

        if (addedProducts.length) {
          setShipments(shipmentsArray);
        }
      }
    }

    processShipments();
  }, [shipments]);

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
            {
              key: '_shipping_group',
              value: `${shippingGroup + 1}`
            }
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
    console.log('METHODS', methods)
    await applyCartLinesChange({
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
  };

  const resetOrderChanges = async () => {
    if (!cachedProducts.length) {
      return;
    }

    console.log('CACHED PRODUCTS', cachedProducts)

    const cachedLinesIds = cachedProducts.map((productId) => {
      return lines.find((line) => line.merchandise.id === productId).id;
    });
    console.log('CACHED PRODUCT IDS', cachedProducts)
    console.log('CACHED LINES IDS', cachedLinesIds)

    const removeProducts = await Promise.all(cachedLinesIds.map( async (lineId) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return applyCartLinesChange({
        type: 'removeCartLine',
        id: lineId,
        quantity: 1
      });
    }));

    console.log('REMOVE PRODUCTS',removeProducts);

    if (removeProducts.some((product) => product.type === 'error')) {
      let tries = 0;

      while (tries < 3) {
        const retryRemoveProducts = await Promise.all(removeProducts.map( async (product, index) => {
          if (product.type === 'error') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return applyCartLinesChange({
              type: 'removeCartLine',
              id: cachedLinesIds[index],
              quantity: 1
            });
          }
          return product;
        }));

        console.log('RETRY REMOVE PRODUCTS', retryRemoveProducts);

        if (!retryRemoveProducts.some((product) => product.type === 'error')) {
          break;
        }

        tries++;
      }
    }

    setCachedProducts([]);
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

    // const retryApplyCartLinesChange = async (line, shipment, shippingGroup, retries = 3) => {
    //   for (let attempt = 1; attempt <= retries; attempt++) {
    //     try {
    //       await applyCartLinesChange({
    //         type: 'updateCartLine',
    //         id: line.id,
    //         attributes: [
    //           {
    //             key: 'ETA',
    //             value: `${countDeliveryDateFromToday(shipment)}`
    //           },
    //           {
    //             key: '_shipping_group',
    //             value: `${shippingGroup + 1}`
    //           }
    //         ]
    //       });
    //
    //       console.log("Applied cart line change")
    //       return;
    //     } catch (error) {
    //       console.log("Error applying cart line change", error.message);
    //       if (error.message.includes("Negotiation was stale") && attempt < retries) {
    //         await new Promise(resolve => setTimeout(resolve, 500));
    //       } else {
    //         throw error;
    //       }
    //     }
    //   }
    // };
    //
    // await Promise.all(lines.map(async (line) => {
    //   let shippingGroup = 0;
    //
    //   const shipment = shipments.find((shipment, index) => {
    //     if (shipment.lineItems.some((item) => item.id === line.merchandise.id)) {
    //       shippingGroup = index;
    //       return true;
    //     }
    //     return false;
    //   });
    //
    //   console.log('---SHIPMENT', shipment);
    //
    //   if (shipment) {
    //     await new Promise(resolve => setTimeout(resolve, 500));
    //     await retryApplyCartLinesChange(line, shipment, shippingGroup);
    //   }
    // }));

    setShipments(shipments);
  }

  const addProduct = async (productId: string, index: number) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await applyCartLinesChange({
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

    const cachedProductsArray = [...cachedProducts];
    cachedProductsArray.push(productId);
    console.log('CACHED PRODUCTS WHEN PRODUCT ADDED', cachedProductsArray)
    setCachedProducts(cachedProductsArray);
  }

  // //**TO_DO**//
  // // handle adding product to shipment group in order list (need to decide the approach of task)
  // const handleConfirm = () => {
  //   const shipmentsArray = [...shipments];
  //   const index = Number(selectedButton.split('-')[1]);
  //   addProduct(shipmentChoice);
  //   shipmentsArray[index].ltl_delivery_product_picked = true;
  //   setShipments(shipmentsArray);
  //   setSelectedButton(null);
  //   setLTLDeliveryProductPicked(true);
  // }

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
    console.log('destinationTypeForm', destinationTypeForm)
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

  console.log('disableSubmitButton', disableSubmitButton())

  const submitForm = () => {
    for (const key in destinationTypeForm) {
      orderAttributesChange({
        key: key,
        type: 'updateAttribute',
        value: destinationTypeForm[key]
      });
    }
    setFormSubmitted(true);
  };

  console.log('haveLtl && !ineligibleForLtl', haveLtl, ineligibleForLtl)

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

            {/*<BlockStack border={"base"} cornerRadius={"base"}>*/}
            {/*  {validationErrors.ltlDeliveryProductNotPicked && (*/}
            {/*    <Banner*/}
            {/*      status={"critical"}*/}
            {/*      title={"Please choose a delivery type before proceeding"}*/}
            {/*    />*/}
            {/*  )}*/}

            {/*  <ToggleButtonGroup*/}
            {/*    value={selectedButton}*/}
            {/*    onChange={(value) => setSelectedButton(value)}*/}
            {/*  >*/}
            {/*    <InlineLayout spacing="base">*/}
            {/*      {shipments.map((shipment, index) => (*/}
            {/*        <ToggleButton*/}
            {/*          id={`toggleBtn-${index}`}*/}
            {/*          key={`toggleBtn-${index}`}*/}
            {/*          disabled={shipment.ltl_delivery_product_picked}*/}
            {/*        >*/}
            {/*          <View*/}
            {/*            blockAlignment="center"*/}
            {/*            inlineAlignment="center"*/}
            {/*            minBlockSize="fill"*/}
            {/*          >*/}
            {/*            {`Shipment ${index + 1}`}*/}
            {/*          </View>*/}
            {/*        </ToggleButton>*/}
            {/*      ))}*/}
            {/*    </InlineLayout>*/}
            {/*  </ToggleButtonGroup>*/}

            {/*  <InlineStack minInlineSize={"fill"} minBlockSize={'fill'}>*/}
            {/*    {shipments.map((shipment, index) => (*/}
            {/*      selectedButton === `toggleBtn-${index}` && (*/}
            {/*        <View key={`toggleBtn-${index}`} inlineAlignment={"end"}>*/}
            {/*          <ChoiceList*/}
            {/*            name="shipment"*/}
            {/*            variant="group"*/}
            {/*            value={shipmentChoice}*/}
            {/*            onChange={(value: string) => setShipmentChoice(value)}*/}
            {/*          >*/}
            {/*            {deliveryProduct.variants.edges.map((variant, index) => (*/}
            {/*              <Choice id={variant.node.id} key={index} disabled={shipment.ltl_delivery_product_picked}>*/}
            {/*                <InlineStack spacing={"base"}>*/}
            {/*                  <Text>{`${variant.node.title} Delivery - delivered to the outside entrance of your home or building at the ground level`}</Text>*/}

            {/*                  <BlockStack spacing={"none"}>*/}
            {/*                    <Text>{`Regular Price: $${Number(variant.node.compareAtPrice.amount).toFixed()}`}</Text>*/}
            {/*                    <Text>{`Discounted Price: $${Number(variant.node.price.amount).toFixed()}`}</Text>*/}
            {/*                  </BlockStack>*/}
            {/*                </InlineStack>*/}
            {/*              </Choice>*/}
            {/*            ))}*/}
            {/*          </ChoiceList>*/}

            {/*          <View padding={"base"}>*/}
            {/*            <Button onPress={() => handleConfirm()}>Confirm</Button>*/}
            {/*          </View>*/}
            {/*        </View>*/}
            {/*      )*/}
            {/*    ))}*/}
            {/*  </InlineStack>*/}
            {/*</BlockStack>*/}
          </>
        )}
      </BlockStack>
    )
  );
}
