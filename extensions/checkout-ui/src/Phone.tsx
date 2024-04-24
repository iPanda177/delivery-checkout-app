import {PhoneField, reactExtension, useShippingAddress} from "@shopify/ui-extensions-react/checkout";
import {useEffect, useState} from "react";


export default reactExtension(
  'purchase.checkout.delivery-address.render-after',
  () => <PhoneConfirmation />,
);

function PhoneConfirmation() {
  const { phone } = useShippingAddress();
  const [phoneConfirmValue, setPhoneConfirmValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(phoneConfirmValue, phone, phoneConfirmValue === phone);
    if (phoneConfirmValue !== phone) {
      setError("Phone does not match");
    } else if (error) {
      setError(null);
    }
  }, [phoneConfirmValue, phone]);

  return <PhoneField
    label="Confirm phone"
    value={phone}
    onChange={(value) => setPhoneConfirmValue(value)}
    required
    error={error}
  />
}
