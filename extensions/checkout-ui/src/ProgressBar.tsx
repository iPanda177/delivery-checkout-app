import {reactExtension, useTotalAmount, View} from "@shopify/ui-extensions-react/checkout";


export default reactExtension(
  'purchase.checkout.cart-line-list.render-after',
  () => <ProgressBar />,
);

function ProgressBar() {
  const cost = useTotalAmount();

  const progress = (80 / 100) * 100;

  return (
    <>
      <View minInlineSize={"100%"} minBlockSize={20} maxBlockSize={20} background={"subdued"}>
        <View
          minInlineSize={`${progress}%`}
          minBlockSize={"100%"}
          background={"base"}
          // style={{
          //   backgroundColor: '#007bff',
          //   height: '100%',
          //   transition: 'width 1s ease-in-out'
          // }}
        >
        </View>
      </View>
    </>
  );
};
