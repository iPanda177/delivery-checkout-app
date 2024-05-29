import {
  PhoneField,
  reactExtension,
  useShippingAddress,
  useBuyerJourneyIntercept,
  useExtensionCapability,
} from "@shopify/ui-extensions-react/checkout";
import {useEffect, useState} from "react";


export default reactExtension(
  'purchase.checkout.delivery-address.render-after',
  () => <PhoneConfirmation />,
);

function PhoneConfirmation() {
  const { phone } = useShippingAddress();
  const canBlockProgress = useExtensionCapability("block_progress");
  const [phoneConfirmValue, setPhoneConfirmValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phoneConfirmValue !== phone) {
      setError("Phone does not match");
    } else if (error) {
      setError(null);
    }
  }, [phoneConfirmValue, phone]);

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && !phone) {
      return {
        behavior: "block",
        reason: "Phone is required",
        perform: (result) => {
          if (result.behavior === "block") {
            setError("Phone is required")
          }
        },
      };
    }

    return {
      behavior: "allow",
      perform: () => {
        setError(null)
      },
    };
  });

  return <PhoneField
    label="Confirm phone"
    value={phoneConfirmValue}
    onChange={(value) => setPhoneConfirmValue(value)}
    required={canBlockProgress}
    error={error}
  />
}
