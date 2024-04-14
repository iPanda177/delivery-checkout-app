import { Button, InlineStack, Text, Thumbnail} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import type { DispatchFunction, RuleState } from "~/types/types";

export default function ProductAddonAutocomplete({
  ruleState,
  dispatch,
  variantData
}: {
  ruleState: RuleState;
  dispatch: DispatchFunction;
  variantData?: { displayName: string; image?: { url?: string; altText?: string } };
}) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    if (variantData) {
      setSelectedProduct({
        productTitle: variantData.displayName,
        productImage: variantData.image && variantData.image.url ? variantData.image.url : null,
        productAlt: variantData.image && variantData.image.altText ? variantData.image.altText : null,
      });
    }
  }, [variantData])

  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select",
    });

    if (products) {
      const { id } = products[0].variants[0];
      const { title } = products[0];
      const productImage = products[0].images[0];

      if (id) {
        dispatch({ type: "SET_RULE_STATE", payload: { ...ruleState, addOnProductId: id, madeChanges: true } })

        setSelectedProduct({
          productTitle: title,
          productImage: productImage && productImage.originalSrc ? productImage.originalSrc : null,
          productAlt: productImage && productImage.altText ? productImage.altText : null,
        })
      }
    }
  }

  const handleRemove = () => {
    dispatch({ type: "SET_RULE_STATE", payload: { ...ruleState, addOnProductId: '' } })

    setSelectedProduct(null);
    dispatch({ type: "SET_RULE_STATE", payload: { ...ruleState, madeChanges: true } })
  }


  return selectedProduct ? (
  <InlineStack blockAlign="center" align="space-between">
    <InlineStack blockAlign="center" gap="500">
      <Thumbnail
        source={selectedProduct.productImage || ImageIcon}
        alt={selectedProduct.productAlt || 'Product image'}
        size={'large'}
      />
      <Text as="span" variant="headingLg" fontWeight="semibold">
        {selectedProduct.productTitle}
      </Text>
    </InlineStack>

    <Button variant="plain" tone="critical" onClick={() => handleRemove()}>Remove</Button>
  </InlineStack>
  ): (
    <Button variant="primary" onClick={selectProduct} disabled={!ruleState.extendedAreaEligible}>Pick a product</Button>
  );
}
