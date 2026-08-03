"use client";

import { LoginPageShell } from "./login-page-shell";
import { useLoginPage } from "./use-login-page";

export default function LoginPage(props: any) {
  const state = useLoginPage(props);
  return <LoginPageShell {...state} />;
}
