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
    trust_href_2,
    image_title_2,
    trust_href_3,
    image_title_3
  }: {
    [key: string]: any;
  } = useSettings();

  return (
    <BlockStack padding={"base"} inlineAlignment={"center"} minBlockSize={300}>
      <Heading level={1}>{title ? title : 'Sample text for trust'}</Heading>

      <InlineStack inlineAlignment={"center"} spacing={"loose"} maxBlockSize={100} minInlineSize={500}>
        <BlockStack inlineAlignment={"center"} maxInlineSize={100}>
          {trust_href_1
            ? (<Image fit={"contain"} source={trust_href_1} />)
            : (<SkeletonImage
              inlineSize={80}
              blockSize={80}
            />)
          }

          <View maxInlineSize={100}>
            <Text size="small">{image_title_1 ? image_title_1 : 'Free, no-contact delivery'}</Text>
          </View>
        </BlockStack>

        <BlockStack inlineAlignment={"center"} maxInlineSize={100}>
          {trust_href_2
            ? (<Image fit={"contain"} source={trust_href_2} />)
            : (<SkeletonImage
              inlineSize={80}
              blockSize={80}
            />)
          }

          <View maxInlineSize={100}>
            <Text size="small">{image_title_2 ? image_title_2 : '10-year limited warranty'}</Text>
          </View>
        </BlockStack>

        <BlockStack inlineAlignment={"center"} maxInlineSize={100}>
          {trust_href_3
            ? (<Image fit={"contain"} source={trust_href_3} />)
            : (<SkeletonImage
              inlineSize={80}
              blockSize={80}
            />)
          }

          <View maxInlineSize={100}>
            <Text size="small">{image_title_3 ? image_title_3 : 'Free, no-contact delivery'}</Text>
          </View>
        </BlockStack>
      </InlineStack>
    </BlockStack>
  );
}
