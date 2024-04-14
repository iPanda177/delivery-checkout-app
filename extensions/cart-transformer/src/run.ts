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

  const productId = input.cart.lines[0].extra_product_id || null;

  if (productId) {
    CHANGES.operations.push(
      {
        merge: {
          cartLines: input.cart.lines.map((line) => ({
            cartLineId: line.id,
            quantity: line.quantity
          }))
        },
        parentVariantId: productId,
        // check later for custom title and image grabbing
        // title: "Meal Kit",
        // image: {
        //   url: "https://cdn.shopify.com/[...]/custom-image.png"
        // }
      }
    )
  }

  return CHANGES.operations.length ? CHANGES : NO_CHANGES;
};
