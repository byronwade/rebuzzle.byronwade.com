/**
 * Email Rendering Utility
 *
 * Renders React Email components to HTML and plain text
 */

import { render } from "@react-email/render";
import type { ReactElement } from "react";

/**
 * Render a React Email component to HTML and plain text
 */
export async function renderEmailTemplate(
  component: ReactElement
): Promise<{ html: string; text: string }> {
  const html = await render(component);
  const text = await render(component, { plainText: true });

  return { html, text };
}

/**
 * Render email template synchronously (for server-side rendering)
 * Note: This actually uses async render but returns a promise
 */
export async function renderEmailTemplateSync(
  component: ReactElement
): Promise<{ html: string; text: string }> {
  const html = await render(component);
  const text = await render(component, { plainText: true });

  return { html, text };
}
