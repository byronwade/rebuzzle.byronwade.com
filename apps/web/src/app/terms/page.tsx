import { TermsPageShell } from "./terms-page-shell";
import { useTermsPage } from "./use-terms-page";

export default function TermsOfServicePage(props: any) {
  const state = useTermsPage(props);
  return <TermsPageShell {...state} />;
}
