import {
  Banner,
  reactExtension,
  useTotalAmount,
} from "@shopify/ui-extensions-react/checkout";


export default reactExtension(
  'purchase.checkout.shipping-option-list.render-before',
  () => <ProgressBar />,
);

function ProgressBar() {
  const { amount } = useTotalAmount();

  const prepareTitle = () => {
    switch (true) {
      case amount < 3000:
        return `Spend $${(3000 - amount).toFixed(2)} more to get free enhanced delivery on your order!`;

      case amount < 5000:
        return `Spend $${(5000 - amount).toFixed(2)} more to get free premium delivery on your order!`;

      case amount < 7000:
        return `Spend $${(7000 - amount).toFixed(2)} more to get free white-glove delivery on your order!`;
    }
  }

  return (
    <>
      {amount < 7000 && (
        <Banner
          status="info"
          title={prepareTitle()}
        />
      )}
    </>
  );
};
