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
import {Location, RuleState, ShippingRulesActionData, ShippingRulesLoaderData} from "~/types/types";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const locations = await getShopLocations(session.shop, admin.graphql);

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
    locationIds: '',
    isDefault: false,
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
  const data = {
    ...Object.fromEntries(await request.formData()),
  };

  if (data.action === "delete") {
    await db.qRCode.delete({ where: { id: Number(params.id) } });
    return redirect("/app/shipping");
  }

  if (data.action === "save") {
    const ruleData = {
      ruleName: String(data.ruleName),
      locationIds: String(data.locationIds),
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

    console.log(ruleData)

    if (params.id !== 'new') {
      await db.shippingRules.update({
        where: { id: Number(params.id) },
        data: ruleData,
      });
    } else {
      await db.shippingRules.create({
        data: ruleData,
      });
    }

    return json({ success: true });
  }
}

export default function ShippingRuleForm() {
  const loaderData = useLoaderData<ShippingRulesLoaderData>();
  const actionData = useActionData<ShippingRulesActionData>();

  const [locations, setLocations] = useState<Location[] | null>(null);
  const [ruleState, setRuleState] = useState<RuleState | null>(null);
  const [error, setError] = useState<String | null>(null);
  const [validationErrors, setValidationErrors] = useState<any>({});
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
    }
  }, [actionData])

  const handlePageAction = (actionType: 'save' | 'delete') => {
    if (ruleState!.zipRangeStart === '') {
      setValidationErrors({ ...validationErrors, zipRangeStartEmpty: true });
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

    setIsLoading(true);

    submit({ ...ruleState, action: actionType }, { method: "post" });
  }

  return (
    <Page>
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
                    ruleState={ruleState}
                    setRuleState={setRuleState}
                  />

                  <Bleed marginInlineStart="200" marginInlineEnd="200">
                    <Divider/>
                  </Bleed>

                  <InlineStack gap="500">
                    <TextField
                      label="Starting Zip Code"
                      value={ruleState.zipRangeStart}
                      onChange={(code) => setRuleState({...ruleState, zipRangeStart: code, madeChanges: true})}
                      error={validationErrors.zipRangeStartEmpty ? 'Starting zip code cannot be empty' : undefined}
                      autoComplete="off"
                    />

                    <TextField
                      label="Ending Zip Code"
                      value={ruleState.zipRangeEnd}
                      onChange={(code) => setRuleState({...ruleState, zipRangeEnd: code, madeChanges: true})}
                      autoComplete="off"
                    />
                  </InlineStack>

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

                  <ProductAddonAutocomplete />
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
