import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BlogFAQItem } from "@/db/models";
import { cn } from "@/lib/utils";

interface FAQSectionProps {
  faqs?: BlogFAQItem[];
  className?: string;
}

export function FAQSection({ faqs, className }: FAQSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-muted/30 border-b py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <HelpCircle className="size-4 text-primary" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`} className="border-b last:border-b-0">
              <AccordionTrigger className="px-4 py-3 text-left text-sm hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
