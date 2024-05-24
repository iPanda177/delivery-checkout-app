import type {
  RunInput,
  FunctionRunResult,
} from "../generated/api";

const NO_CHANGES: FunctionRunResult = {
  operations: [],
};

export function run(input: RunInput): FunctionRunResult {
  const CHANGES: { operations: { hide: { deliveryOptionHandle: any } }[] } = {
    operations: []
  };

  const deliveryTypesAttr = input.cart.lines.find((line) => line.disable_methods?.value)

  if (deliveryTypesAttr) {
    const disableDeliveryTypes = deliveryTypesAttr.disable_methods?.value?.split(', ');
    const deliveryOptions = input.cart.deliveryGroups[0].deliveryOptions;

    if (disableDeliveryTypes && disableDeliveryTypes.includes('Standard')) {
      const deliveryOptionHandle = deliveryOptions.find((option) => option.title === 'Front door delivery')?.handle;

      if (deliveryOptionHandle) {
        CHANGES.operations.push(
          {
            hide: {
              deliveryOptionHandle: deliveryOptionHandle
            }
          }
        )
      }
    }

    if (disableDeliveryTypes && disableDeliveryTypes.includes('Enhanced')) {
      const deliveryOptionHandle = deliveryOptions.find((option) => option.title?.includes('Enhanced'))?.handle;

      if (deliveryOptionHandle) {
        CHANGES.operations.push(
          {
            hide: {
              deliveryOptionHandle: deliveryOptionHandle
            }
          }
        )
      }
    }

    if (disableDeliveryTypes && disableDeliveryTypes.includes('Premium')) {
      const deliveryOptionHandle = deliveryOptions.find((option) => option.title?.includes('Premium'))?.handle;

      if (deliveryOptionHandle) {
        CHANGES.operations.push(
          {
            hide: {
              deliveryOptionHandle: deliveryOptionHandle
            }
          }
        )
      }
    }

    if (disableDeliveryTypes && disableDeliveryTypes.includes('White-glove')) {
      const deliveryOptionHandle = deliveryOptions.find((option) => option.title?.includes('White glove'))?.handle;

      if (deliveryOptionHandle) {
        CHANGES.operations.push(
          {
            hide: {
              deliveryOptionHandle: deliveryOptionHandle
            }
          }
        )
      }
    }

  }

  return CHANGES.operations.length ? CHANGES : NO_CHANGES;
};
