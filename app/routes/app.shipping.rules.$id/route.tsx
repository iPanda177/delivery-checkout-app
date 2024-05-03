import { useEffect, useReducer } from "react";
import { json, redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getProductVariantData, getShippingRule, getShopLocations } from "~/models/Shipping.server";
import {
  useLoaderData,
  useSubmit,
  useNavigate, useActionData,
} from "@remix-run/react";
import {
  Card,
  Bleed,
  Divider,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
  BlockStack,
  PageActions,
  Checkbox,
  Banner,
  Button
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";

import LocationSelectCombobox from "./locationSelectionComboBox";
import ProductAddonAutocomplete from "./productAddonAutocomplete";

import db from "../../db.server";

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import type {
  LocationT,
  RuleState,
  ShippingRulesActionData,
  ShippingRulesLoaderData,
  ZipCodeRange,
  ShippingRulesReducerState,
  Action, ValidationErrors
} from "~/types/types";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const locations = await getShopLocations(admin.graphql);

  if (params.id !== 'new') {
    const ruleState = await getShippingRule(Number(params.id));

    if (!ruleState) {
      return json({ error: { id: "Rule not found" } }, { status: 404 });
    }

    let variantData = null

    if (ruleState.addOnProductId) {
      variantData = await getProductVariantData(ruleState.addOnProductId, admin.graphql);
    }

    return json({ ...{ locations }, ruleState, variantData });
  }

  const ruleState = {
    id: null,
    ruleName: '',
    locations: [],
    isDefault: false,
    zipCodeRanges: [{ zipRangeStart: '', zipRangeEnd: '' }],
    zipRangeStart: '',
    zipRangeEnd: '',
    etaDaysSmallParcelLow: 0,
    etaDaysSmallParcelHigh: 0,
    etaDaysFreightLow: 0,
    etaDaysFreightHigh: 0,
    extendedAreaEligible: false,
    addOnProductId: '',
  };

  return json({ ...{ locations }, ruleState });
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const data = {
      ...Object.fromEntries(await request.formData()),
    };

    const selectedLocationsArray = JSON.parse(data.selectedLocations as string);
    const zipCodeRangesData = JSON.parse(data.zipCodeRanges as string);

    if (data.action === "delete") {
      await db.locationToShippingRule.deleteMany({
        where: { shippingRuleId: Number(params.id) }
      });

      await db.zipCodeRanges.deleteMany({
        where: { shippingRulesId: Number(params.id) }
      });

      await db.shippingRules.delete({ where: { id: Number(params.id) } });
      return redirect("/app/shipping");
    }

    if (data.action === "save") {
      const ruleData = {
        ruleName: String(data.ruleName),
        isDefault: data.isDefault === 'true',
        zipRangeStart: String(data.zipRangeStart),
        zipRangeEnd: String(data.zipRangeEnd),
        etaDaysSmallParcelLow: Number(data.etaDaysSmallParcelLow),
        etaDaysSmallParcelHigh: Number(data.etaDaysSmallParcelHigh),
        etaDaysFreightLow: Number(data.etaDaysFreightLow),
        etaDaysFreightHigh: Number(data.etaDaysFreightHigh),
        extendedAreaEligible: data.extendedAreaEligible === 'true',
        addOnProductId: String(data.addOnProductId),
      };

      if (params.id !== 'new') {
        await db.locationToShippingRule.deleteMany({
          where: { shippingRuleId: Number(params.id) }
        });

        await db.zipCodeRanges.deleteMany({
          where: { shippingRulesId: Number(params.id) }
        });

        await db.shippingRules.update({
          where: { id: Number(params.id) },
          data: ruleData,
        });

        await Promise.all(selectedLocationsArray.map(
          async (location: LocationT) => {
            const locationExists = await db.location.findFirst({
              where: {
                locationId: location.locationId,
              },
            });

            if (locationExists) {
              await db.locationToShippingRule.create({
                data: {
                  locationId: locationExists.id,
                  shippingRuleId: Number(params.id),
                },
              });

              return locationExists;
            }

            const createdLocation = await db.location.create({
              data: {
                locationId: location.locationId,
                locationName: location.locationName,
              },
            });

            await db.locationToShippingRule.create({
              data: {
                locationId: createdLocation.id,
                shippingRuleId: Number(params.id),
              },
            });

            return createdLocation;
          },
        ));

        await Promise.all(zipCodeRangesData.map(
          async (zipCodeRange: ZipCodeRange) => (
            await db.zipCodeRanges.create({
              data: {
                zipRangeStart: zipCodeRange.zipRangeStart,
                zipRangeEnd: zipCodeRange.zipRangeEnd,
                shippingRulesId: Number(params.id)
              }
            })
          )
        ))
      } else {
        const shippingRules = await db.shippingRules.findMany({
          where: {
            zipRangeStart: {
              lte: ruleData.zipRangeStart,
            },
            zipRangeEnd: {
              gte: ruleData.zipRangeEnd,
            },
            locations: {
              some: {
                location: {
                  locationId: {
                    in: selectedLocationsArray.map((location: LocationT) => location.locationId),
                  },
                },
              },
            }
          },
        });

        if (shippingRules.length > 0) {
          return json({ success: false, error: 'Rule already exists' });
        }

        const createdShippingRule  = await db.shippingRules.create({
          data: ruleData,
        });

        await Promise.all(selectedLocationsArray.map(
          async (location: LocationT) => {
            const locationExists = await db.location.findFirst({
              where: {
                locationId: location.locationId,
              },
            });

            if (locationExists) {
              await db.locationToShippingRule.create({
                data: {
                  locationId: locationExists.id,
                  shippingRuleId: createdShippingRule.id,
                },
              });

              return locationExists;
            }

            const createdLocation = await db.location.create({
              data: {
                locationId: location.locationId,
                locationName: location.locationName,
              },
            });

            await db.locationToShippingRule.create({
              data: {
                locationId: createdLocation.id,
                shippingRuleId: createdShippingRule.id,
              },
            });

            return createdLocation;
          },
        ));

        await Promise.all(zipCodeRangesData.map(
          async (zipCodeRange: ZipCodeRange) => (
            await db.zipCodeRanges.create({
              data: {
                zipRangeStart: zipCodeRange.zipRangeStart,
                zipRangeEnd: zipCodeRange.zipRangeEnd,
                shippingRulesId: createdShippingRule.id
              }
            })
          )
        ))
      }

      return json({ success: true });
    }
  } catch (err) {
    console.error(err);
    return json({ success: false });
  }
}

const initialState: ShippingRulesReducerState = {
  locations: null,
  ruleState: null,
  selectedLocations: [],
  zipCodeRanges: [],
  error: null,
  validationErrors: {},
  isLoading: false,
};

function reducer(state: ShippingRulesReducerState, action: Action) {
  switch (action.type) {
    case "SET_LOCATIONS":
      return { ...state, locations: action.payload };
    case "SET_RULE_STATE":
      return { ...state, ruleState: action.payload };
    case "SET_SELECTED_LOCATIONS":
      return { ...state, selectedLocations: action.payload, madeChanges: true };
    case "SET_ZIP_CODE_RANGES":
      return { ...state, zipCodeRanges: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_VALIDATION_ERRORS":
      return { ...state, validationErrors: action.payload };
    case "SET_IS_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export default function ShippingRuleForm() {
  const loaderData = useLoaderData<ShippingRulesLoaderData>();
  const actionData = useActionData<ShippingRulesActionData>();

  const [state, dispatch] = useReducer(reducer, initialState);

  const navigate = useNavigate();
  const submit = useSubmit();

  useEffect(() => {
    if (loaderData.error) {
      dispatch({ type: "SET_ERROR", payload: loaderData.error.id });
    }

    if (loaderData.locations) {
      dispatch({ type: "SET_LOCATIONS", payload: loaderData.locations });
    }

    if (loaderData.ruleState) {
      const editedRuleState: RuleState = { ...loaderData.ruleState };
      editedRuleState.madeChanges = false;

      dispatch({ type: "SET_RULE_STATE", payload: editedRuleState });
      dispatch({ type: "SET_ZIP_CODE_RANGES", payload: loaderData.ruleState.zipCodeRanges });
      // @ts-ignore
      dispatch({ type: "SET_SELECTED_LOCATIONS", payload: loaderData.ruleState.locations });
    }
  }, [loaderData])

  useEffect(() => {
    if (actionData && actionData.success) {
      dispatch({ type: "SET_IS_LOADING", payload: false });

      shopify.toast.show("Rule created");
      navigate("/app/shipping");
    } else if (actionData && !actionData.success) {
      dispatch({ type: "SET_IS_LOADING", payload: false });

      if (actionData && actionData.error === 'Rule already exists') {
        shopify.toast.show("Rule for one of the selected zip codes and warehouses already exists", { isError: true, duration: 1000 });
      } else {
        shopify.toast.show("Error creating rule", { isError: true });
      }
    }
  }, [actionData])

  const handleZipCodeRangeChange = (index: number, type: 'start' | 'end', value: string) => {
    const updatedZipCodeRanges = [...state.zipCodeRanges];
    updatedZipCodeRanges[index][type === 'start' ? 'zipRangeStart' : 'zipRangeEnd'] = value;

    dispatch({ type: "SET_ZIP_CODE_RANGES", payload: updatedZipCodeRanges });
  }

  const handleAddingZipCodeRange = () => {
    dispatch({ type: "SET_ZIP_CODE_RANGES", payload: [...state.zipCodeRanges, { zipRangeStart: '', zipRangeEnd: '' }] });
    // @ts-ignore
    dispatch({ type: "SET_RULE_STATE", payload: { ...state.ruleState, madeChanges: true } });
  }

  const handlePageAction = (actionType: 'save' | 'delete') => {
    const validationErrors: ValidationErrors = {};

    switch (true) {
      case state.zipCodeRanges.some(zipCodeRange => zipCodeRange.zipRangeStart === ''):
        validationErrors.zipRangeStartEmpty = true;

      case state.zipCodeRanges.some(zipCodeRange => zipCodeRange.zipRangeEnd < zipCodeRange.zipRangeStart):
        validationErrors.zipRangeEndLessThanStart = true;

      case state.ruleState!.ruleName === '':
        validationErrors.ruleNameEmpty = true;

      case state.ruleState!.etaDaysSmallParcelLow === 0:
        validationErrors.etaDaysSmallParcelLowEmpty = true;

      case state.ruleState!.etaDaysSmallParcelHigh === 0:
        validationErrors.etaDaysSmallParcelHighEmpty = true;

      case state.ruleState!.etaDaysFreightLow === 0:
        validationErrors.etaDaysFreightLowEmpty = true;

      case state.ruleState!.etaDaysFreightHigh === 0:
        validationErrors.etaDaysFreightHighEmpty = true;

      default:
        break;
    }

    if (Object.keys(validationErrors).length > 0) {
      dispatch({ type: "SET_VALIDATION_ERRORS", payload: validationErrors });
      return;
    }

    const lowestZipCodeStart = Math.min(...state.zipCodeRanges.map((zipCodeRange: ZipCodeRange) => Number(zipCodeRange.zipRangeStart)));
    const highestZipCodeEnd = Math.max(...state.zipCodeRanges.map((zipCodeRange: ZipCodeRange) => Number(zipCodeRange.zipRangeEnd)));

    const updatedRuleState = {
      ...state.ruleState,
      zipRangeStart: String(lowestZipCodeStart),
      zipRangeEnd: String(highestZipCodeEnd),
    };

    dispatch({ type: "SET_IS_LOADING", payload: true });

    submit({
      ...updatedRuleState,
      selectedLocations: JSON.stringify([...state.selectedLocations]),
      zipCodeRanges: JSON.stringify([...state.zipCodeRanges]),
      action: actionType
    }, { method: "post" });
  }

  return (
    <Page narrowWidth>
      <ui-title-bar
        title={
          state.ruleState && state.ruleState.id ? "Edit Shipping Rule" : "Create New Shipping Rule"
        }
      >
        <button variant="breadcrumb" onClick={() => navigate("/app/shipping")}>
          Shipping & Delivery
        </button>
      </ui-title-bar>

      {state.error && (
        <>
          <Banner
            title="Error: Rule not found"
            tone="critical"
          >
            <p>
              The rule you were looking for could not be found. Please check Rules List for the correct rule.
            </p>

            <Button onClick={() => navigate("/app/shipping")}>Go back to Rules List</Button>
          </Banner>
        </>
      )}

      {state.locations && state.ruleState && (
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="500">
                  <Text as={"h2"} variant="headingLg">
                    Rule Name
                  </Text>

                  <TextField
                    id="title"
                    helpText="Only store staff can see this title"
                    label="title"
                    labelHidden
                    autoComplete="off"
                    value={state.ruleState.ruleName}
                    // @ts-ignore
                    onChange={(name) => dispatch({ type: "SET_RULE_STATE", payload: { ...state.ruleState, ruleName: name, madeChanges: true }})}
                    error={state.validationErrors.ruleNameEmpty ? 'Rule name cannot be empty' : undefined}
                  />

                  <Checkbox
                    label="Default Rule"
                    checked={state.ruleState.isDefault}
                    // @ts-ignore
                    onChange={(value) => dispatch({ type: "SET_RULE_STATE", payload: { ...state.ruleState, isDefault: value, madeChanges: true }})}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="500">
                  <Text as={"h2"} variant="headingLg">
                    Apply to Locations
                  </Text>

                  <LocationSelectCombobox
                    locations={state.locations}
                    ruleState={state.ruleState}
                    selectedLocations={state.selectedLocations}
                    dispatch={dispatch}
                  />

                  <Bleed marginInlineStart="200" marginInlineEnd="200">
                    <Divider/>
                  </Bleed>

                  <InlineStack gap="500" align={"space-between"}>
                    <Text as={"h2"} variant="headingLg">
                      Zip Code Ranges
                    </Text>

                    <Button
                      onClick={() => handleAddingZipCodeRange()}
                      icon={PlusIcon}
                    >
                      Add Zip Code Range
                    </Button>
                  </InlineStack>

                  {state.zipCodeRanges.map((zipCodeRange: ZipCodeRange, index: number) => (
                    <BlockStack gap="500" key={index}>
                      <Text as={"h3"} variant="headingMd">
                        Zip Code Range {index + 1}
                      </Text>

                      <InlineStack gap="500">
                        <TextField
                          label="Starting Zip Code"
                          value={zipCodeRange.zipRangeStart}
                          onChange={(code) => handleZipCodeRangeChange(index, 'start', code)}
                          error={state.validationErrors.zipRangeStartEmpty ? 'Starting zip code cannot be empty' : undefined}
                          autoComplete="off"
                        />

                        <TextField
                          label="Ending Zip Code"
                          value={zipCodeRange.zipRangeEnd}
                          onChange={(code) => handleZipCodeRangeChange(index, 'end', code)}
                          error={state.validationErrors.zipRangeEndLessThanStart ? 'Ending zip code must be greater than starting zip code' : undefined}
                          autoComplete="off"
                        />
                      </InlineStack>
                    </BlockStack>
                  ))}

                  <Bleed marginInlineStart="200" marginInlineEnd="200">
                    <Divider/>
                  </Bleed>

                  <Text as={"h3"} variant="headingMd">
                    Small Parcel Shipments
                  </Text>

                  <InlineStack gap="500">
                    <TextField
                      label="ETA Days Small Parcel Low"
                      type="number"
                      value={String(state.ruleState.etaDaysSmallParcelLow)}
                      // @ts-ignore
                      onChange={(value) => dispatch({ type: "SET_RULE_STATE", payload: { ...state.ruleState, etaDaysSmallParcelLow: Number(value), madeChanges: true }})}
                      error={state.validationErrors.etaDaysSmallParcelLowEmpty ? 'ETA days small parcel low cannot be empty' : undefined}
                      autoComplete="off"
                      min={0}
                    />

                    <TextField
                      label="ETA Days Small Parcel High"
                      type="number"
                      value={String(state.ruleState.etaDaysSmallParcelHigh)}
                      // @ts-ignore
                      onChange={(value) => dispatch({ type: "SET_RULE_STATE", payload: { ...state.ruleState, etaDaysSmallParcelHigh: Number(value), madeChanges: true }})}
                      error={state.validationErrors.etaDaysSmallParcelHighEmpty ? 'ETA days small parcel high cannot be empty' : undefined}
                      autoComplete="off"
                      min={0}
                    />
                  </InlineStack>

                  <Text as={"h3"} variant="headingMd">
                    FTL / Freight Shipments
                  </Text>

                  <InlineStack gap="500">
                    <TextField
                      label="ETA Days Freight Low"
                      type="number"
                      value={String(state.ruleState.etaDaysFreightLow)}
                      // @ts-ignore
                      onChange={(value) => dispatch({ type: "SET_RULE_STATE", payload: { ...state.ruleState, etaDaysFreightLow: Number(value), madeChanges: true }})}
                      error={state.validationErrors.etaDaysFreightLowEmpty ? 'ETA days freight low cannot be empty' : undefined}
                      autoComplete="off"
                      min={0}
                    />

                    <TextField
                      label="ETA Days Freight High"
                      type="number"
                      value={String(state.ruleState.etaDaysFreightHigh)}
                      // @ts-ignore
                      onChange={(value) => dispatch({ type: "SET_RULE_STATE", payload: { ...state.ruleState, etaDaysFreightHigh: Number(value), madeChanges: true }})}
                      error={state.validationErrors.etaDaysFreightHighEmpty ? 'ETA days freight high cannot be empty' : undefined}
                      autoComplete="off"
                      min={0}
                    />
                  </InlineStack>

                  <Bleed marginInlineStart="200" marginInlineEnd="200">
                    <Divider/>
                  </Bleed>

                  <Checkbox
                    label="Requires Delivery Surcharge / Product Addon"
                    checked={state.ruleState.extendedAreaEligible}
                    // @ts-ignore
                    onChange={(value) => dispatch({ type: "SET_RULE_STATE", payload: { ...state.ruleState, extendedAreaEligible: value, madeChanges: true }})}
                  />

                  <ProductAddonAutocomplete
                    ruleState={state.ruleState}
                    dispatch={dispatch}
                    variantData={loaderData.variantData}
                  />
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <PageActions
              secondaryActions={[
                {
                  content: "Delete",
                  loading: state.isLoading,
                  disabled: state.ruleState.id === null,
                  destructive: true,
                  outline: true,
                  onAction: () => handlePageAction('delete')
                },
              ]}
              primaryAction={{
                content: "Save",
                loading: state.isLoading,
                disabled: !state.ruleState.madeChanges,
                onAction: () => handlePageAction('save'),
              }}
            />
          </Layout.Section>
        </Layout>
      )}
    </Page>
  );
}
