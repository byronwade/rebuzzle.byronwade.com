import type { ReactNode } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";

export interface LegalSection {
  id: string;
  title: string;
}

/**
 * Long-form legal copy: display header, a sticky contents rail on wide
 * screens, and a single readable column.
 */
export function LegalLayout({
  title,
  description,
  lastUpdated,
  sections,
  children,
}: {
  title: string;
  description: string;
  lastUpdated: string;
  sections: readonly LegalSection[];
  children: ReactNode;
}) {
  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
        <PageHeader
          className="border-border border-b pb-8 md:pb-10"
          description={
            <>
              {description} <span className="text-subtle">Last updated {lastUpdated}.</span>
            </>
          }
          eyebrow="Legal"
          title={title}
        />
        <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="eyebrow">On this page</p>
              <ol className="mt-3 space-y-1.5 border-border border-l text-sm">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      className="-ml-px block border-transparent border-l py-0.5 pl-3 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-ring"
                      href={`#${section.id}`}
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
          <article className="legal-prose min-w-0 max-w-2xl">{children}</article>
        </div>
      </div>
    </Layout>
  );
}
