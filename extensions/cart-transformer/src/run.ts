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

 const ltlProduct = input.cart.lines.find((line) => line.free_delivery?.value === 'free');

  if (ltlProduct) {
    CHANGES.operations.push(
      {
        update: {
          cartLineId: ltlProduct.id,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: 0,
              }
            }
          }
        }
      }
    )
  }

  return CHANGES.operations.length ? CHANGES : NO_CHANGES;
};
