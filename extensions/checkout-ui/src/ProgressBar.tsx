import {reactExtension, useTotalAmount, View} from "@shopify/ui-extensions-react/checkout";


export default reactExtension(
  'purchase.checkout.cart-line-list.render-after',
  () => <ProgressBar />,
);

function ProgressBar() {
  const cost = useTotalAmount();

  const progress = (80 / 100) * 100;

  return (
    <></>
  );
};
