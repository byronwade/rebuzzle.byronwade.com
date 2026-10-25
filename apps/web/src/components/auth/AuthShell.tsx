import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { RebuzzleLogo } from "@/components/brand/RebuzzleLogo";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * The frame every account page shares: mark, title, one line of context, a
 * single card for the form, and a quiet footer for the way out.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-[400px] flex-col px-4 py-14 md:py-20">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link aria-label="Rebuzzle home" className="rounded-lg focus-ring" href="/">
            <RebuzzleLogo showWordmark={false} size="lg" />
          </Link>
          <h1 className="mt-6 text-balance font-semibold text-2xl text-foreground tracking-[-0.04em]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-balance text-muted-foreground text-sm leading-6">
              {description}
            </p>
          ) : null}
        </div>
        <Card className="p-6 sm:p-7" variant="float">
          {children}
        </Card>
        {footer ? (
          <div className="mt-6 space-y-3 text-center text-muted-foreground text-sm">{footer}</div>
        ) : null}
      </div>
    </Layout>
  );
}

/** Label, optional leading icon, input, and one line of help or error. */
export function AuthField({
  id,
  label,
  icon: Icon,
  error,
  help,
  aside,
  className,
  ...inputProps
}: {
  id: string;
  label: string;
  icon?: LucideIcon;
  error?: string | null;
  help?: string;
  /** Sits at the end of the label row, e.g. a "Forgot password?" link. */
  aside?: ReactNode;
} & Omit<ComponentProps<typeof Input>, "id">) {
  const messageId = error ? `${id}-error` : help ? `${id}-help` : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      <div className="relative">
        {Icon ? (
          <Icon
            aria-hidden
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 h-4 w-4 text-subtle"
          />
        ) : null}
        <Input
          aria-describedby={messageId}
          aria-invalid={Boolean(error)}
          className={cn(Icon && "pl-10", className)}
          id={id}
          {...inputProps}
        />
      </div>
      {error ? (
        <p className="text-destructive text-xs" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : help ? (
        <p className="text-subtle text-xs" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** Form-level error or success notice above the fields. */
export function AuthNotice({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm",
        tone === "error"
          ? "border-destructive/25 bg-destructive/[0.07] text-destructive"
          : "border-success/25 bg-success/[0.07] text-foreground"
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export const authFooterLink = "font-medium text-foreground underline-offset-4 hover:underline";
