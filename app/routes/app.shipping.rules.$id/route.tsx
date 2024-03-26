import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { authenticate } from "../../shopify.server";
import {
  Card,
  Bleed,
  Button,
  ChoiceList,
  Divider,
  EmptyState,
  InlineStack,
  InlineError,
  Layout,
  Listbox,
  Page,
  Text,
  TextField,
  Thumbnail,
  BlockStack,
  PageActions,
  Combobox,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";

import LocationSelectCombobox from "./locationSelectionComboBox";

import db from "../../db.server";
import { getShopLocations } from "../../models/Shipping.server";
import { threadId } from "worker_threads";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const locations = await getShopLocations(session.shop, admin.graphql);
  const formState = {};

  if (params.id === "new") {
    return json({ ...{ locations }, formState });
  }

  return json(await getRule(Number(params.id), admin.graphql));
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
    shop,
  };

  if (data.action === "delete") {
    await db.qRCode.delete({ where: { id: Number(params.id) } });
    return redirect("/app");
  }

  // const errors = validateQRCode(data);

  if (errors) {
    return json({ errors }, { status: 422 });
  }

  // const shippingRule =
  //   params.id === "new"
  //     ? await db.qRCode.create({ data })
  //     : await db.qRCode.update({ where: { id: Number(params.id) }, data });

  // return redirect(`/app/shipping/rules/${rule.id}`);
}

export default function ShippingRuleForm() {
  const errors = useActionData()?.errors || {};

  const loaderData = useLoaderData<typeof loader>();
  const [data, setData] = useState(loaderData);
  const { formState } = data;
  const [cleanFormState, setCleanFormState] = useState(loaderData.formState);
  const isDirty =
    JSON.stringify(data.formState) !== JSON.stringify(cleanFormState);

  const nav = useNavigation();
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";
  const isDeleting =
    nav.state === "submitting" && nav.formData?.get("action") === "delete";

  const navigate = useNavigate();

  const submit = useSubmit();

  function handleSave() {
    const saveData = {
      title: formState.title,
      productId: formState.productId || "",
      productVariantId: formState.productVariantId || "",
      productHandle: formState.productHandle || "",
      destination: formState.destination,
    };

    setCleanFormState({ ...formState });
    submit(data, { method: "post" });
  }

  console.log(data);

  return (
    <Page>
      <ui-title-bar
        title={
          loaderData.id ? "Edit Shipping Rule" : "Create New Shipping Rule"
        }
      >
        <button variant="breadcrumb" onClick={() => navigate("/app/shipping")}>
          Shipping & Delivery
        </button>
      </ui-title-bar>
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
                  value={formState.title}
                  onChange={(title) => setFormState({ ...formState, title })}
                  error={errors.title}
                />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="500">
                <Text as={"h2"} variant="headingLg">
                  Apply to Locations
                </Text>
                <LocationSelectCombobox data={data} setData={setData} />
                <Bleed marginInlineStart="200" marginInlineEnd="200">
                  <Divider />
                </Bleed>
                <InlineStack gap="500" align="space-between" blockAlign="start">
                  <ChoiceList
                    title="Scan destination"
                    choices={[
                      { label: "Link to product page", value: "product" },
                      {
                        label: "Link to checkout page with product in the cart",
                        value: "cart",
                      },
                    ]}
                    selected={[formState.destination]}
                    onChange={(destination) =>
                      setFormState({
                        ...formState,
                        destination: destination[0],
                      })
                    }
                    error={errors.destination}
                  />
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section>
          <PageActions
            secondaryActions={[
              {
                content: "Delete",
                loading: isDeleting,
                disabled: isSaving || isDeleting,
                destructive: true,
                outline: true,
                onAction: () =>
                  submit({ action: "delete" }, { method: "post" }),
              },
            ]}
            primaryAction={{
              content: "Save",
              loading: isSaving,
              disabled: !isDirty || isSaving || isDeleting,
              onAction: handleSave,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
