"use client";

import { SignupPageShell } from "./signup-page-shell";
import { useSignupPage } from "./use-signup-page";

export default function SignupPage(props: any) {
  const state = useSignupPage(props);
  return <SignupPageShell {...state} />;
}
