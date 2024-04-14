import { json } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text, Badge
} from "@shopify/polaris";

import db from "../../db.server";
import type { ShippingRules } from "@prisma/client";

export async function loader() {
  return json(
    await db.shippingRules.findMany({
      orderBy: { zipRangeStart: "asc" },
    })
  );
}

export default function Index() {
  const navigate = useNavigate();

  const truncate = (str: string, { length = 25 } = {}) => {
    if (!str) return "";
    if (str.length <= length) return str;
    return str.slice(0, length) + "…";
  }

  const ZipCodeTable = () => {
    const shippingRules = useLoaderData<typeof loader>();

    return (
      <IndexTable
        resourceName={{
          singular: "Zip Code Range",
          plural: "Zip Code Ranges",
        }}
        headings={[
          { title: "Name" },
          { title: "Zip Start" },
          { title: "Zip End" },
          { title: "ETA Small Parcel Low" },
          { title: "ETA Small Parcel High" },
          { title: "ETA Days Freight Low" },
          { title: "ETA Days Freight High" },
          { title: "Extended Area Delivery Eligible" },
          { title: "Required Addon Product or Surcharge" },
        ]}
        itemCount={shippingRules.length}
        sortable={[false, true, true]}
        selectable={false}
      >
        {shippingRules.map((shippingRule: ShippingRules) => (
          <ZipCodeTableRow key={shippingRule.id} shippingRule={shippingRule} />
        ))}
      </IndexTable>
    );
  };

  const ZipCodeTableRow = ({
     shippingRule
  } : {
    shippingRule: ShippingRules
  }) => (
    <IndexTable.Row id={String(shippingRule.id)} position={shippingRule.id}>
      <IndexTable.Cell>
        <Link to={`/app/shipping/rules/${shippingRule.id}`}>
          {truncate(shippingRule.ruleName)}
        </Link>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="span">{shippingRule.zipRangeStart}</Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="span">{shippingRule.zipRangeEnd}</Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="span">{shippingRule.etaDaysSmallParcelLow}</Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="span">{shippingRule.etaDaysSmallParcelHigh}</Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="span">{shippingRule.etaDaysFreightLow}</Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="span">{shippingRule.etaDaysFreightHigh}</Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="span">
          <Badge size={"large"} tone={shippingRule.extendedAreaEligible ? "success" : undefined}>{shippingRule.extendedAreaEligible ? "true" : "false"}</Badge>
          </Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="span">{shippingRule.addOnProductId}</Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  );

  return (
    <Page fullWidth>
      <ui-title-bar title="Shipping & Delivery">
        <button
          variant="primary"
          onClick={() => navigate("/app/shipping/rules/new")}
        >
          Add New Rule
        </button>
      </ui-title-bar>

      <Layout>
        <Layout.Section>
          <Card padding="0">
            <ZipCodeTable />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
