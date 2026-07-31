import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { BlogFAQItem } from "@/db/models";
import { cn } from "@/lib/utils";

interface FAQSectionProps {
  faqs?: BlogFAQItem[];
  className?: string;
}

export function FAQSection({ faqs, className }: FAQSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section className={cn(className)}>
      <h2 className="eyebrow">Frequently asked</h2>
      <Accordion className="mt-2 w-full border-border border-t" collapsible type="single">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent className="pb-5 pr-8">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
