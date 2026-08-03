"use client";

import { UserMenuShell } from "./user-menu-shell";
import { useUserMenu } from "./use-user-menu";

export function UserMenu(props: any) {
  const state = useUserMenu(props);
  return <UserMenuShell {...state} />;
}
