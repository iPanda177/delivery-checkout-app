import type {
  RunInput,
  FunctionRunResult,
} from "../generated/api";

const NO_CHANGES: FunctionRunResult = {
  operations: [],
};

export function run(input: RunInput): FunctionRunResult {
  const CHANGES: any = {
    operations: [],
  };

  const cartLines = input.cart.lines;

  const groupedLines = cartLines.reduce((groups: any, line) => {
    const groupKey = line.shipping_group?.value;

    if (!groupKey) {
      return groups;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push(line);
    return groups;
  }, {});

  for (const groupKey in groupedLines) {
    const group = groupedLines[groupKey];
    const attributes = [];

    const cartLineWithETA = group.find((line: any) => line.estimation_time !== null);
    const cartLineWithDisableMethods = group.find((line: any) => line.disable_methods !== null);

    if (cartLineWithETA) {
      const estimationTime = cartLineWithETA.estimation_time.value;

      attributes.push({
        key: "ETA",
        value: estimationTime,
      });
    }

    if (cartLineWithDisableMethods) {
      const disableMethods = cartLineWithDisableMethods.disable_methods.value;

      attributes.push({
        key: "_disable_methods",
        value: disableMethods,
      });
    }

    if (group.length > 1) {
      const mergeOperation = {
        merge: {
          attributes: attributes,
          cartLines: group.map((line: { id: string, quantity: number}) => ({
            cartLineId: line.id,
            quantity: line.quantity,
          })),
          parentVariantId: `gid://shopify/ProductVariant/48775290945857`,
          title: `Shipment Group ${groupKey}`,
          image: {
            url: "https://cdn.shopify.com/s/files/1/0847/4830/4705/files/FooterIcons-05_99564687-b7b4-474d-9c9f-5d3e5e95b4a5.jpg?v=1712863318"
          },
        }
      };
      CHANGES.operations.push(mergeOperation);
    }
  }

  return CHANGES.operations.length ? CHANGES : NO_CHANGES;
};
