import {
  reactExtension, useShippingAddress, useCartLines, useApplyCartLinesChange,
} from '@shopify/ui-extensions-react/checkout';
import { useEffect } from "react";

export default reactExtension(
  'purchase.checkout.footer.render-after',
  () => <Extension />,
);

function Extension() {
  const APP_URL = 'https://joy-rocket-en-underground.trycloudflare.com'
  const lines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const { zip } = useShippingAddress();

  useEffect(() => {
    checkRules(zip);
  }, [zip])

  const checkRules = async (zip: string) => {
    const resp = await fetch(`${APP_URL}/app/check-rules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zip }),
    })
      .then((response) => response.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    console.log(resp);

    if (resp.productId) {
      addProduct(resp.productId);
    }
  }

  const addProduct = (productId: string) => {
    lines.forEach((line) => {
      applyCartLinesChange({
        type: 'updateCartLine',
        id: line.id,
        attributes: [{
          key: '_extra_product_id',
          value: productId
        }]
      }).then((res) => {
        console.log(res);
      })
    })
  }

  return (
    <></>
  );
}
