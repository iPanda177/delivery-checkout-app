import {type ActionFunctionArgs, json} from "@remix-run/node";
import {useLoaderData, Link, useNavigate, useSubmit, useActionData} from "@remix-run/react";
// @ts-ignore
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
  List,
  Box,
  LegacyCard,
} from "@shopify/polaris";

import db from "../../db.server";
import type { ShippingRules } from "@prisma/client";
import {Fragment, useCallback, useEffect, useState} from "react";
import {groupedShippingRules, LocationT, ZipCodeRange} from "~/types/types";
import {authenticate} from "~/shopify.server";
import {getLocationData} from "~/models/Shipping.server";

export async function loader() {
  const deliveryTypes = await db.deliveryType.findMany();

  if (deliveryTypes.length === 0) {
    const deliveryTypesNames = ['Standard', 'Enhanced', 'Premium', 'White-glove'];


    for (const deliveryTypeName of deliveryTypesNames) {
      await db.deliveryType.create({
        data: {
          name: deliveryTypeName,
        },
      });
    }
  }

  return json(
    await db.shippingRules.findMany({
      include: {
        locations: {
          include: {
            location: true,
          },
        },
        zipCodeRanges: true,
      },
      orderBy: { zipRangeStart: "asc" },
    })
  );
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    const { data }: {data?: any} = {
      ...Object.fromEntries(await request.formData()),
    };
    const parsedData = JSON.parse(data);
    let newRulesCount = 0;
    let rejectedRulesCount = 0;

    for (const row of parsedData) {
      const selectedLocations = JSON.parse(row.selectedLocations as string);

      const selectedLocationsArray = await Promise.all(selectedLocations.map(async (locationId: string) => {
        const location = await db.location.findFirst({
          where: {
            locationId: `gid://shopify/Location/${locationId}`,
          },
        });

        if (location) {
          return { locationId: location.locationId, locationName: location.locationName };
        }

        return await getLocationData(locationId, admin.graphql);
      }));

      const zipCodeRangesData = JSON.parse(row.zipCodeRanges as string);

      const ruleData = {
        ruleName: String(row.ruleName),
        isDefault: row.isDefault,
        zipRangeStart: String(row.zipRangeStart),
        zipRangeEnd: String(row.zipRangeEnd),
        etaDaysSmallParcelLow: Number(row.etaDaysSmallParcelLow),
        etaDaysSmallParcelHigh: Number(row.etaDaysSmallParcelHigh),
        etaDaysFreightLow: Number(row.etaDaysFreightLow),
        etaDaysFreightHigh: Number(row.etaDaysFreightHigh),
        extendedAreaEligible: row.extendedAreaEligible === 'true',
        addOnProductId: String(row.addOnProductId),
      };

      console.log('ruleData', ruleData);

      if (ruleData.zipRangeStart !== 'Infinity' && ruleData.zipRangeEnd !== '-Infinity') {
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
          rejectedRulesCount++;
          continue;
        }
      } else {
        const shippingRules = await db.shippingRules.findMany({
          where: {
            zipRangeStart: 'Infinity',
            zipRangeEnd: '-Infinity',
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
          rejectedRulesCount++;
          continue;
        }
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
      ));

      newRulesCount++;
    }

    return json({ success: true, created: newRulesCount, rejected: rejectedRulesCount });
  } catch (err) {
    console.error(err);
    return json({ success: false });
  }
}

export default function Index() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const shippingRules = useLoaderData<typeof loader>();
  const actionData: { success: boolean, created?: number, rejected?: number} | undefined = useActionData<typeof action>();

  const [groupedShippingRules, setGroupedShippingRules] = useState<groupedShippingRules>({});
  const [file, setFile] = useState<File>();
  const [rejectedFile, setRejectedFile] = useState<File>();

  useEffect(() => {
    if (shippingRules) {
      const locationRules: { [key: string]: any[] } = {};

      shippingRules.forEach(rule => {
        rule.locations.forEach(locationInfo => {
          const locationName = locationInfo.location.locationName;
          if (!locationRules[locationName]) {
            locationRules[locationName] = [];
          }
          locationRules[locationName].push(rule);
        });
      });

      setGroupedShippingRules(locationRules);
    }
  }, [shippingRules]);

  useEffect(() => {
    if (actionData && actionData.success) {
      shopify.toast.show(`${actionData.created} rules created successfully, ${actionData.rejected} rules was rejected. Reason: Rule for picked zip code already exists.`);
    }
  }, [actionData])

  useEffect(() => {
    if (file) {
      handleFileChange(file);
      setFile(undefined)
    }
  }, [file]);

  const truncate = (str: string, { length = 25 } = {}) => {
    if (!str) return "";
    if (str.length <= length) return str;
    return str.slice(0, length) + "…";
  }

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
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

        resolve(data);
      };

      reader.onerror = function(error) {
        reject(error);
      };

      reader.readAsText(file);
    });
  };

  const exportCSV = async () => {
    const csvData = shippingRules.map((rule: ShippingRules | any) => {
      const locations = rule.locations.map((location: any) => location.location.locationId.split('/').pop()).join(', ');

      const zipCodeRanges = rule.zipCodeRanges.map((range: any) => `${range.zipRangeStart}-${range.zipRangeEnd}`).join(', ');

      return [
        rule.ruleName,
        rule.isDefault,
        JSON.stringify(locations),
        zipCodeRanges,
        rule.etaDaysSmallParcelLow,
        rule.etaDaysSmallParcelHigh,
        rule.etaDaysFreightLow,
        rule.etaDaysFreightHigh,
      ];
    });

    const csvContent = 'RuleName;IsDefault;Locations;ZipCodeRanges;SmallParcelLow;SmallParcelHigh;FreightLow;FreightHigh;\n'
      + csvData.map(e => e.join(';') + ';').join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'shipping_rules.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileChange = async (file: any) => {
    try {
      const csvData = await readCSVFile(file);

      const parsedData = [];

      for (const row of csvData) {
        const values = row.map(value => value.trim());
        const ruleName = values[0];
        const isDefault = values[1] === 'true';
        const locations = JSON.parse(values[2]).split(', ')
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
          extendedAreaEligible: false,
          addOnProductId: '',
        };

        parsedData.push(ruleObject);
      }

      await submit({ data: JSON.stringify(parsedData) }, { method: 'POST' })

      shopify.modal.hide('my-modal');
    } catch (error) {
      console.error('Error in reading file:', error);
    }
  };

  const fileUpload = !file && <DropZone.FileUpload actionHint="Accepts .csv" />;

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
          { title: "No EAD" },
          { title: "Required Addon Product or Surcharge" },
        ]}
        itemCount={shippingRules.length}
        sortable={[false, true, true]}
        selectable={false}
      >
        {
          Object.keys(groupedShippingRules).map((locationName: string, index: number) => {
            const shippingRules = groupedShippingRules[locationName as keyof typeof groupedShippingRules];

            return (
              <Fragment key={`${index}-fragment`}>
                <IndexTable.Row
                  rowType="subheader"
                  id={`${index}-subheader`}
                  key={`${index}-subheader`}
                  position={index}
                >
                  <IndexTable.Cell
                    colSpan={9}
                    scope="colgroup"
                    as="th"
                  >
                    {`${locationName}`}
                  </IndexTable.Cell>
                </IndexTable.Row>

                {shippingRules.map((shippingRule: ShippingRules) => (
                  <ZipCodeTableRow key={shippingRule.id} shippingRule={shippingRule} />
                ))}
              </Fragment>
            );
          })
        }
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
        <Text as="span">{shippingRule.zipRangeStart.includes('Infinity') ? '--/--' : shippingRule.zipRangeStart}</Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text as="span">{shippingRule.zipRangeEnd.includes('Infinity') ? '--/--' : shippingRule.zipRangeEnd}</Text>
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
          <Badge size={"large"} tone={shippingRule.ineligibleForLtl ? "success" : undefined}>{shippingRule.ineligibleForLtl ? "true" : "false"}</Badge>
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
          Import CSV file
        </button>

        <button
          onClick={() => exportCSV()}
        >
          Export as CSV
        </button>
      </ui-title-bar>

      <Modal id="my-modal">
        <TitleBar title={"Upload rules file"}/>

        <Box as={"div"} minWidth={"600"} minHeight={"600"}>
          <LegacyCard>
            {errorMessage}
            <DropZone accept=".csv" type="file" onDrop={handleDropZoneDrop} allowMultiple={false} variableHeight>
              {fileUpload}
            </DropZone>
          </LegacyCard>
        </Box>
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
