import {reactExtension, PaymentIcon, InlineStack} from "@shopify/ui-extensions-react/checkout";


export default reactExtension(
  'purchase.checkout.footer.render-after',
  () => <TrustedLogos />,
);

function TrustedLogos() {
  return (
    <InlineStack spacing={"none"}>
      <PaymentIcon name="visa" />
      <PaymentIcon name="master" />
      <PaymentIcon name="american-express" />
      <PaymentIcon name="discover" />
    </InlineStack>
  );
}
