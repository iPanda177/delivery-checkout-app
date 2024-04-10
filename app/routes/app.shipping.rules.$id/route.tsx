import { useEffect, useState } from "react";
import { json, redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getShippingRule, getShopLocations } from "~/models/Shipping.server";
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

import LocationSelectCombobox from "./locationSelectionComboBox";
import ProductAddonAutocomplete from "./productAddonAutocomplete";

import db from "../../db.server";

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import type {
  Location,
  LocationGraphQLResponse,
  RuleState,
  ShippingRulesActionData,
  ShippingRulesLoaderData,
  ValidationErrors,
  ZipCodeRange
} from "~/types/types";
import {PlusIcon} from "@shopify/polaris-icons";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const locations = await getShopLocations(admin.graphql);

  if (params.id !== 'new') {
    const ruleState = await getShippingRule(Number(params.id), admin.graphql);

    if (!ruleState) {
      return json({ error: { id: "Rule not found" } }, { status: 404 });
    }

    return json({ ...{ locations }, ruleState });
  }

  const ruleState = {
    id: null,
    ruleName: '',
    locations: [],
    isDefault: false,
    zipCodeRanges: [],
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

    const selectedLocationsArray = JSON.parse(data.selectedLocations);
    const zipCodeRangesData = JSON.parse(data.zipCodeRanges);
    console.log(zipCodeRangesData)

    if (data.action === "delete") {
      await db.qRCode.delete({ where: { id: Number(params.id) } });
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
        await db.shippingRules.update({
          where: { id: Number(params.id) },
          data: ruleData,
        });
      } else {
        const createdShippingRule  = await db.shippingRules.create({
          data: ruleData,
        });

        await Promise.all(selectedLocationsArray.map(
          async (location: Location) => {
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

        // await Promise.all(zipCodeRangesData.map(
        //   async (zipCodeRange: ZipCodeRange) => (
        //     await db.zipCodeRanges.create({
        //       data: {
        //         zipRangeStart: zipCodeRange.zipRangeStart,
        //         zipRangeEnd: zipCodeRange.zipRangeEnd,
        //         shippingRulesId: createdShippingRule.id
        //       }
        //     })
        //   )
        // ))
      }

      return json({ success: true });
    }
  } catch (err) {
    console.error(err);
    return json({ success: false });
  }
}

export default function ShippingRuleForm() {
  const loaderData = useLoaderData<ShippingRulesLoaderData>();
  const actionData = useActionData<ShippingRulesActionData>();

  const [locations, setLocations] = useState<LocationGraphQLResponse[] | null>(null);
  const [ruleState, setRuleState] = useState<RuleState | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [zipCodeRanges, setZipCodeRanges] = useState<ZipCodeRange[]>([{ zipRangeStart: '', zipRangeEnd: '' }]);
  const [error, setError] = useState<String | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const submit = useSubmit();

  useEffect(() => {
    if (loaderData.error) {
      setError(loaderData.error.id);
    }

    if (loaderData.locations) {
      setLocations(loaderData.locations);
    }

    if (loaderData.ruleState) {
      const editedRuleState: RuleState = { ...loaderData.ruleState };
      editedRuleState.madeChanges = false;

      setRuleState(loaderData.ruleState);
    }
  }, [loaderData])

  useEffect(() => {
    if (actionData && actionData.success) {
      setIsLoading(false);

      shopify.toast.show("Rule created");
    } else if (actionData && !actionData.success) {
      setIsLoading(false);

      shopify.toast.show("Error creating rule", { isError: true });
    }
  }, [actionData])

  const handleZipCodeRangeChange = (index: number, type: 'start' | 'end', value: string) => {
    const updatedZipCodeRanges = [...zipCodeRanges];
    updatedZipCodeRanges[index][type === 'start' ? 'zipRangeStart' : 'zipRangeEnd'] = value;

    setZipCodeRanges(updatedZipCodeRanges);
  }

  const handlePageAction = (actionType: 'save' | 'delete') => {
    if (zipCodeRanges.some(zipCodeRange => zipCodeRange.zipRangeStart === '')) {
      setValidationErrors({ ...validationErrors, zipRangeStartEmpty: true });
    }

    if (zipCodeRanges.some(zipCodeRange => zipCodeRange.zipRangeEnd < zipCodeRange.zipRangeStart)) {
      setValidationErrors({ ...validationErrors, zipRangeEndLessThanStart: true });
    }

    if (ruleState!.ruleName === '') {
      setValidationErrors({ ...validationErrors, ruleNameEmpty: true });
    }

    if (ruleState!.etaDaysSmallParcelLow === 0) {
      setValidationErrors({ ...validationErrors, etaDaysSmallParcelLowEmpty: true });
    }

    if (ruleState!.etaDaysSmallParcelHigh === 0) {
      setValidationErrors({ ...validationErrors, etaDaysSmallParcelHighEmpty: true });
    }

    if (ruleState!.etaDaysFreightLow === 0) {
      setValidationErrors({ ...validationErrors, etaDaysFreightLowEmpty: true });
    }

    if (ruleState!.etaDaysFreightHigh === 0) {
      setValidationErrors({ ...validationErrors, etaDaysFreightHighEmpty: true });
    }

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const lowestZipCodeStart = Math.min(...zipCodeRanges.map(zipCodeRange => Number(zipCodeRange.zipRangeStart)));
    const highestZipCodeEnd = Math.max(...zipCodeRanges.map(zipCodeRange => Number(zipCodeRange.zipRangeEnd)));

    const updatedRuleState = {
      ...ruleState,
      zipRangeStart: String(lowestZipCodeStart),
      zipRangeEnd: String(highestZipCodeEnd),
    };

    setIsLoading(true);

    submit({
      ...updatedRuleState,
      selectedLocations: JSON.stringify([...selectedLocations]),
      zipCodeRanges: JSON.stringify([...zipCodeRanges]),
      action: actionType
    }, { method: "post" });
  }

  return (
    <Page narrowWidth>
      <ui-title-bar
        title={
          ruleState && ruleState.id ? "Edit Shipping Rule" : "Create New Shipping Rule"
        }
      >
        <button variant="breadcrumb" onClick={() => navigate("/app/shipping")}>
          Shipping & Delivery
        </button>
      </ui-title-bar>

      {error && (
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

      {locations && ruleState && (
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
                    value={ruleState.ruleName}
                    onChange={(name) => setRuleState({...ruleState, ruleName: name, madeChanges: true})}
                    error={validationErrors.ruleNameEmpty ? 'Rule name cannot be empty' : undefined}
                  />

                  <Checkbox
                    label="Default Rule"
                    checked={ruleState.isDefault}
                    onChange={(value) => setRuleState({...ruleState, isDefault: value, madeChanges: true})}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="500">
                  <Text as={"h2"} variant="headingLg">
                    Apply to Locations
                  </Text>

                  <LocationSelectCombobox
                    locations={locations}
                    selectedLocations={selectedLocations}
                    setSelectedLocations={setSelectedLocations}
                  />

                  <Bleed marginInlineStart="200" marginInlineEnd="200">
                    <Divider/>
                  </Bleed>

                  <InlineStack gap="500" align={"space-between"}>
                    <Text as={"h2"} variant="headingLg">
                      Zip Code Ranges
                    </Text>

                    <Button
                      onClick={() => setZipCodeRanges([...zipCodeRanges, { zipRangeStart: '', zipRangeEnd: '' }])}
                      icon={PlusIcon}
                    >
                      Add Zip Code Range
                    </Button>
                  </InlineStack>

                  {zipCodeRanges.map((zipCodeRange, index) => (
                    <BlockStack gap="500" key={index}>
                      <Text as={"h3"} variant="headingMd">
                        Zip Code Range {index + 1}
                      </Text>

                      <InlineStack gap="500">
                        <TextField
                          label="Starting Zip Code"
                          value={zipCodeRange.zipRangeStart}
                          onChange={(code) => handleZipCodeRangeChange(index, 'start', code)}
                          error={validationErrors.zipRangeStartEmpty ? 'Starting zip code cannot be empty' : undefined}
                          autoComplete="off"
                        />

                        <TextField
                          label="Ending Zip Code"
                          value={zipCodeRange.zipRangeEnd}
                          onChange={(code) => handleZipCodeRangeChange(index, 'end', code)}
                          error={validationErrors.zipRangeEndLessThanStart ? 'Ending zip code must be greater than starting zip code' : undefined}
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
                      value={String(ruleState.etaDaysSmallParcelLow)}
                      onChange={(value) => setRuleState({...ruleState, etaDaysSmallParcelLow: Number(value), madeChanges: true})}
                      error={validationErrors.etaDaysSmallParcelLowEmpty ? 'ETA days small parcel low cannot be empty' : undefined}
                      autoComplete="off"
                    />

                    <TextField
                      label="ETA Days Small Parcel High"
                      type="number"
                      value={String(ruleState.etaDaysSmallParcelHigh)}
                      onChange={(value) => setRuleState({...ruleState, etaDaysSmallParcelHigh: Number(value), madeChanges: true})}
                      error={validationErrors.etaDaysSmallParcelHighEmpty ? 'ETA days small parcel high cannot be empty' : undefined}
                      autoComplete="off"
                    />
                  </InlineStack>

                  <Text as={"h3"} variant="headingMd">
                    FTL / Freight Shipments
                  </Text>

                  <InlineStack gap="500">
                    <TextField
                      label="ETA Days Freight Low"
                      type="number"
                      value={String(ruleState.etaDaysFreightLow)}
                      onChange={(value) => setRuleState({...ruleState, etaDaysFreightLow: Number(value), madeChanges: true})}
                      error={validationErrors.etaDaysFreightLowEmpty ? 'ETA days freight low cannot be empty' : undefined}
                      autoComplete="off"
                    />

                    <TextField
                      label="ETA Days Freight High"
                      type="number"
                      value={String(ruleState.etaDaysFreightHigh)}
                      onChange={(value) => setRuleState({...ruleState, etaDaysFreightHigh: Number(value), madeChanges: true})}
                      error={validationErrors.etaDaysFreightHighEmpty ? 'ETA days freight high cannot be empty' : undefined}
                      autoComplete="off"
                    />
                  </InlineStack>

                  <Bleed marginInlineStart="200" marginInlineEnd="200">
                    <Divider/>
                  </Bleed>

                  <Checkbox
                    label="Requires Delivery Surcharge / Product Addon"
                    checked={ruleState.extendedAreaEligible}
                    onChange={(value) => setRuleState({...ruleState, extendedAreaEligible: value, madeChanges: true})}
                  />

                  <ProductAddonAutocomplete
                    ruleState={ruleState}
                    setRuleState={setRuleState}
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
                  loading: isLoading,
                  disabled: ruleState.id === null,
                  destructive: true,
                  outline: true,
                  onAction: () => handlePageAction('delete')
                },
              ]}
              primaryAction={{
                content: "Save",
                loading: isLoading,
                disabled: !ruleState.madeChanges,
                onAction: () => handlePageAction('save'),
              }}
            />
          </Layout.Section>
        </Layout>
      )}
    </Page>
  );
}
