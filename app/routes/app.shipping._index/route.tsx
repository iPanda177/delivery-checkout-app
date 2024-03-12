import { Page, Layout, Card, IndexTable } from "@shopify/polaris";

import db from "../../db.server";

import { json } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";

export async function loader() {
  return json(
    await db.deliveryZipCodes.findMany({
      orderBy: { zipRangeStart: "asc" },
    })
  );
}

const ZipCodeTable = () => {
  const zipCodes = useLoaderData<typeof loader>();

  return (
    <>
      <IndexTable
        resourceName={{
          singular: "Zip Code Range",
          plural: "Zip Code Ranges",
        }}
        headings={[
          { title: "Zip Code Start" },
          { title: "Zip Code End" },
          { title: "ETA Small Parcel Low" },
          { title: "ETA Small Parcel High" },
          { title: "ETA Days Freight Low" },
          { title: "ETA Days Freight High" },
          { title: "Extended Area Delivery Eligible" },
          { title: "Requires EAD Surcharge" },
          { title: "Surcharge Amount" },
        ]}
        itemCount={zipCodes.length}
      >
        {/* {{zipCodes.map}() => (
        <ZipCodeTableRow key={id} />
      )} */}
        {console.log(zipCodes)}
      </IndexTable>
    </>
  );
};

const ZipCodeTableRow = ({ zipCode }) => {};

export default function Index() {
  return (
    <Page>
      <ui-title-bar title="Shipping & Delivery">
        <button variant="primary" onClick={() => {}}>
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
