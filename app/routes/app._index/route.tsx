import {ActionFunctionArgs, LoaderFunctionArgs, redirect} from "@remix-run/node";
import {
  Page,
} from "@shopify/polaris";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const url = new URL(request.url);

  throw redirect(`/app/shipping?${url.searchParams.toString()}`);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  return null
};

export default function Index() {
  return (
    <Page />
  );
}
