import {
  Banner,
  reactExtension,
  useTotalAmount,
  useCartLines,
  useApplyCartLinesChange
} from "@shopify/ui-extensions-react/checkout";
import {useEffect, useState} from "react";


export default reactExtension(
  'purchase.checkout.block.render',
  () => <ProgressBar />,
);

function ProgressBar() {
  const { amount } = useTotalAmount();
  const applyCartLinesChange = useApplyCartLinesChange();
  const deliveryProduct = useCartLines().find(line => line.merchandise.title.includes('LTL Delivery'));
  const [title, setTitle] = useState(null);


  useEffect(() => {
    if (deliveryProduct) {
      console.log('deliveryProduct', deliveryProduct, amount)
      const cost = deliveryProduct.cost.totalAmount.amount;

      if (cost === 0) {
        return;
      }
      console.log('COOOOOOOOOST', cost)

      switch (true) {
        case amount >= 3000 && deliveryProduct.merchandise.subtitle.includes('Enhanced'):
        case amount >= 5000 && deliveryProduct.merchandise.subtitle.includes('Premium'):
        case amount >= 7000 && deliveryProduct.merchandise.subtitle.includes('White Glove'):
          console.log("STATEMENT WORKS")
          addFreeAttribute(deliveryProduct);
          break;

        default:
          break;
      }

      if (cost > 0) {
        setTitle(prepareTitle(amount));
      }
    }

    setTitle(prepareTitle(amount));
  }, [amount]);

  const addFreeAttribute = async (line: any) => {
    console.log('Adding free attribute to line', line.id)
    const updateAttr = await applyCartLinesChange({
      type: 'updateCartLine',
      id: line.id,
      attributes: [{
        key: '_free_delivery',
        value: 'free'
      }]
    });

    console.log('updateAttr', updateAttr);
  };

  const prepareTitle = (amount: number) => {
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
      {title && (
        <Banner
          status="info"
          title={title}
        />
      )}
    </>
  );
};
