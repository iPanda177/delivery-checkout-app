import {
  reactExtension,
  InlineStack,
  useSettings,
  Image,
  SkeletonImage,
  BlockStack,
  Heading,
  Text, View
} from "@shopify/ui-extensions-react/checkout";


export default reactExtension(
  'purchase.checkout.block.render',
  () => <TrustedLogos />,
);

function TrustedLogos() {
  const {
    title,
    trust_href_1,
    image_title_1,
    image_title_1_centered,
    trust_href_2,
    image_title_2,
    image_title_2_centered,
    trust_href_3,
    image_title_3,
    image_title_3_centered
  }: {
    [key: string]: any;
  } = useSettings();

  return (
    <BlockStack padding={"base"} inlineAlignment={"center"} minBlockSize={300}>
      {title && (<Heading level={1}>{title}</Heading>)}

      <InlineStack inlineAlignment={"center"} spacing={"loose"} maxBlockSize={100} minInlineSize={500}>
        <BlockStack inlineAlignment={image_title_1_centered ? "center" : "start"} maxInlineSize={120}>
          {trust_href_1 && (<Image fit={"contain"} source={trust_href_1} />)}

          <View maxInlineSize={100}>
            <Text size="small">{image_title_1 ? image_title_1 : 'Free, no-contact delivery'}</Text>
          </View>
        </BlockStack>

        <BlockStack inlineAlignment={image_title_2_centered ? "center" : "start"} maxInlineSize={120}>
          {trust_href_2 && (<Image fit={"contain"} source={trust_href_2} />)}

          <View maxInlineSize={100}>
            <Text size="small">{image_title_2 ? image_title_2 : '10-year limited warranty'}</Text>
          </View>
        </BlockStack>

        <BlockStack inlineAlignment={image_title_3_centered ? "center" : "start"} maxInlineSize={120}>
          {trust_href_3 && (<Image fit={"contain"} source={trust_href_3} />)}

          <View maxInlineSize={100}>
            <Text size="small">{image_title_3 ? image_title_3 : 'Free, no-contact delivery'}</Text>
          </View>
        </BlockStack>
      </InlineStack>
    </BlockStack>
  );
}
