import {Autocomplete, Button, Icon, InlineStack, Text, Thumbnail} from "@shopify/polaris";
import {ImageIcon, SearchIcon} from "@shopify/polaris-icons";
import {useCallback, useMemo, useState} from "react";
import {RuleState} from "~/types/types";

export default function ProductAddonAutocomplete({
  ruleState,
  setRuleState,
}: {
  ruleState: RuleState;
  setRuleState: (ruleState: RuleState) => void;
}) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select", // customized action verb, either 'select' or 'add',
    });

    if (products) {
      console.log(products);
      const { id } = products[0].variants[0];
      const { title } = products[0];
      const productImage = products[0].images[0];

      if (id) {
        setRuleState({
          ...ruleState,
          addOnProductId: id,
        });

        setSelectedProduct({
          productTitle: title,
          productImage: productImage && productImage.originalSrc ? productImage.originalSrc : null,
          productAlt: productImage && productImage.altText ? productImage.altText : null,
        })
      }
    }
  }

  const handleRemove = () => {
    setRuleState({
      ...ruleState,
      addOnProductId: '',
    });

    setSelectedProduct(null);
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
