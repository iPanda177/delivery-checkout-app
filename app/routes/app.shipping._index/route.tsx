import {type ActionFunctionArgs, json, redirect} from "@remix-run/node";
import {useLoaderData, Link, useNavigate, useSubmit} from "@remix-run/react";
import {Modal, TitleBar} from '@shopify/app-bridge-react';
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  DropZone,
  Banner,
  List, Box,
} from "@shopify/polaris";

import db from "../../db.server";
import type { ShippingRules } from "@prisma/client";
import {useCallback, useEffect, useState} from "react";
import type {LocationT, ZipCodeRange} from "~/types/types";

export async function loader() {
  return json(
    await db.shippingRules.findMany({
      orderBy: { zipRangeStart: "asc" },
    })
  );
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { data } = {
      ...Object.fromEntries(await request.formData()),
    };
    const parsedData = JSON.parse(data);
    console.log('Parsed Data:', parsedData[0])

    for (const row of parsedData) {
      const selectedLocationsArray = JSON.parse(row.selectedLocations as string);
      const zipCodeRangesData = JSON.parse(row.zipCodeRanges as string);

      const ruleData = {
        ruleName: String(row.ruleName),
        isDefault: row.isDefault === 'true',
        zipRangeStart: String(row.zipRangeStart),
        zipRangeEnd: String(row.zipRangeEnd),
        etaDaysSmallParcelLow: Number(row.etaDaysSmallParcelLow),
        etaDaysSmallParcelHigh: Number(row.etaDaysSmallParcelHigh),
        etaDaysFreightLow: Number(row.etaDaysFreightLow),
        etaDaysFreightHigh: Number(row.etaDaysFreightHigh),
        extendedAreaEligible: row.extendedAreaEligible === 'true',
        addOnProductId: String(row.addOnProductId),
      };

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
        async (location: string) => {
          const locationExists = await db.location.findFirst({
            where: {
              locationName: location,
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

          // const createdLocation = await db.location.create({
          //   data: {
          //     locationId: location.locationId,
          //     locationName: location.locationName,
          //   },
          // });

          // await db.locationToShippingRule.create({
          //   data: {
          //     locationId: createdLocation.id,
          //     shippingRuleId: createdShippingRule.id,
          //   },
          // });

          // return createdLocation;
          return null
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
      ));
    }

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ success: false });
  }
}

export default function Index() {
  const navigate = useNavigate();
  const submit = useSubmit();

  const [file, setFile] = useState<File>();
  const [rejectedFile, setRejectedFile] = useState<File>();
  console.log(file)

  useEffect(() => {
    if (file) {
      console.log(file)
      handleFileChange(file);
    }
  }, [file]);

  const truncate = (str: string, { length = 25 } = {}) => {
    if (!str) return "";
    if (str.length <= length) return str;
    return str.slice(0, length) + "…";
  }

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
      console.log('Accepted Files', acceptedFiles)
      if (_rejectedFiles.length > 0) {
        setRejectedFile(_rejectedFiles[0]);
        return;
      }

      if (acceptedFiles.length > 0 && rejectedFile) {
        setRejectedFile(undefined);
      }
      setFile(acceptedFiles[0])
    },
    [],
  );

  const readCSVFile = (file: Blob): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function(event) {
        const contents = event.target!.result;
        const lines = (contents as string).split('\n').slice(1);
        const filteredLines = lines.filter((line: string) => line.trim() !== '');
        const data: string[][] = [];

        filteredLines.forEach((line: string) => {
          const values = line.split(';');
          data.push(values);
        });

        console.log('CSV DATA', data);
        resolve(data);
      };

      reader.onerror = function(error) {
        reject(error);
      };

      reader.readAsText(file);
    });
  };

  const handleFileChange = async (file: any) => {
    try {
      const csvData = await readCSVFile(file);
      console.log('CSV данные:', csvData);

      const parsedData = [];

      for (const row of csvData) {
        const values = row.map(value => value.trim());
        const ruleName = values[0];
        const isDefault = values[1] === 'true';
        const locations = values[2].split(',').map(location => location.trim());
        const zipCodeRanges = values[3].split(',').map(range => {
          const [startStr, endStr] = range.trim().split('-');
          const start = parseInt(startStr);
          const end = parseInt(endStr);
          if (!isNaN(start) && !isNaN(end)) {
            return { zipRangeStart: String(start), zipRangeEnd: String(end) };
          } else {
            console.error('Error in pick range:', range.trim());
            return null;
          }
        }).filter(Boolean);
        console.log(locations, zipCodeRanges)
        const smallParcelLow = parseInt(values[4]);
        const smallParcelHigh = parseInt(values[5]);
        const freightLow = parseInt(values[6]);
        const freightHigh = parseInt(values[7]);

        const zipRangeStart = Math.min(...zipCodeRanges.map(range => Number(range!.zipRangeStart)));
        const zipRangeEnd = Math.max(...zipCodeRanges.map(range => Number(range!.zipRangeEnd)));

        const ruleObject = {
          ruleName,
          isDefault,
          zipRangeStart: String(zipRangeStart),
          zipRangeEnd: String(zipRangeEnd),
          etaDaysSmallParcelLow: String(smallParcelLow),
          etaDaysSmallParcelHigh: String(smallParcelHigh),
          etaDaysFreightLow: String(freightLow),
          etaDaysFreightHigh: String(freightHigh),
          selectedLocations: JSON.stringify(locations),
          zipCodeRanges: JSON.stringify(zipCodeRanges),
        };

        parsedData.push(ruleObject);
      }

      console.log('Parsed Data:', parsedData);

      await submit({ data: JSON.stringify(parsedData) }, { method: 'POST' })

      shopify.modal.hide('my-modal');
    } catch (error) {
      console.error('Ошибка при чтении CSV файла:', error);
    }
  };

  const fileUpload = !file && <DropZone.FileUpload />;

  const errorMessage = rejectedFile && (
    <Banner title="The following file couldn’t be uploaded:" tone="critical">
      <List type="bullet">
        <List.Item>
          {`"${rejectedFile.name}" is not supported. File type must be .csv`}
        </List.Item>
      </List>
    </Banner>
  );

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

        <button
          onClick={() => shopify.modal.show('my-modal')}
        >
          Import
        </button>
      </ui-title-bar>

      <Modal id="my-modal">
        <Box as={"div"} minHeight={"400"}>
          {errorMessage}
          <DropZone accept=".csv" type="file" onDrop={handleDropZoneDrop} allowMultiple={false}>
            {fileUpload}
          </DropZone>
        </Box>

        <TitleBar title="Title">
          <button variant="primary">Label</button>
          <button onClick={() => shopify.modal.hide('my-modal')}>Cancel</button>
        </TitleBar>
      </Modal>

      <Layout>
        <Layout.Section>
          <Card padding="0">
            <ZipCodeTable/>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
