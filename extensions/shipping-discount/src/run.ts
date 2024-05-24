import type {
  RunInput,
  FunctionRunResult
} from "../generated/api";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discounts: [],
};

export function run(input: RunInput): FunctionRunResult {
  const CHANGES: any = {
    discounts: [],
  };

  const cost = input.cart.cost.totalAmount.amount;
  const deliveryOptions = input.cart.deliveryGroups[0].deliveryOptions
    .map((options) => {
      return { handle: options.handle, title: options.title }
    });

  switch (true) {
    case Number(cost) >= 7000:
      CHANGES.discounts.push({
        targets: deliveryOptions.map((option) => ({
          deliveryOption: {
            handle: option.handle
          }
        })),
        value: {
          percentage: {
            value: 100
          }
        }
      });
      break;

    case Number(cost) >= 5000:
      CHANGES.discounts.push({
        targets: deliveryOptions
          .filter((option) => !option.title?.includes('White'))
          .map((option) => ({
            deliveryOption: {
              handle: option.handle
            }})
          ),
        value: {
          percentage: {
            value: 100
          }
        }
      });
      break;

    case Number(cost) >= 3000:
      CHANGES.discounts.push({
        targets: deliveryOptions
          .filter((option) => !option.title?.includes('Premium') && !option.title?.includes('White'))
          .map((option) => ({
            deliveryOption: {
              handle: option.handle
            }})
          ),
        value: {
          percentage: {
            value: 100
          }
        }
      });
      break;
  }

  return CHANGES.discounts.length ? CHANGES : EMPTY_DISCOUNT;
};
