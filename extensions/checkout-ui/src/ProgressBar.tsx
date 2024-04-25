import {reactExtension, PaymentIcon, InlineStack, useTotalAmount} from "@shopify/ui-extensions-react/checkout";


export default reactExtension(
  'purchase.checkout.cart-line-list.render-after',
  () => <ProgressBar />,
);

function ProgressBar() {
  const cost = useTotalAmount();

  const progress = (80 / 100) * 100;

  return (
    <div style={{ width: '100%', backgroundColor: '#ddd', height: '20px' }}>
      <div
        style={{
          width: `${progress}%`,
          backgroundColor: '#007bff',
          height: '100%',
          transition: 'width 1s ease-in-out'
        }}
      />
    </div>
  );
};
