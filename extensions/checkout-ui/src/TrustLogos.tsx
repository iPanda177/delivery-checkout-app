import {reactExtension, PaymentIcon, InlineStack, useSettings, Image} from "@shopify/ui-extensions-react/checkout";


export default reactExtension(
  'purchase.checkout.footer.render-after',
  () => <TrustedLogos />,
);

function TrustedLogos() {
  const {
    link_1,
    link_2,
    link_3,
    link_4
  }: {
    [key: string]: any;
  } = useSettings();

  return (
    <InlineStack spacing={"none"} maxBlockSize={24}>
      <PaymentIcon name="visa" />
      <PaymentIcon name="master" />
      <PaymentIcon name="american-express" />
      <PaymentIcon name="discover" />
      {link_1 && <Image fit={"contain"} source={link_1} />}
      {link_2 && <Image fit={"contain"} source={link_2} />}
      {link_3 && <Image fit={"contain"} source={link_3} />}
      {link_4 && <Image fit={"contain"} source={link_4} />}
    </InlineStack>
  );
}
