"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TOPICS = [
  { id: "product", label: "Product / UX" },
  { id: "ai", label: "AI systems" },
  { id: "puzzle-quality", label: "Puzzle quality" },
  { id: "bug", label: "Bug report" },
  { id: "docs", label: "Docs clarity" },
  { id: "other", label: "Other" },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

export function HowItWorksFeedbackForm({ className }: { className?: string }) {
  const [topic, setTopic] = useState<TopicId>("ai");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            message,
            email: email.trim() || undefined,
            name: name.trim() || undefined,
            page: "/how-it-works",
            website: honeypot,
          }),
        });
        const data = (await response.json()) as { success?: boolean; error?: string };
        if (!(response.ok && data.success)) {
          setError(data.error || "Could not send feedback.");
          return;
        }
        setDone(true);
        setMessage("");
      } catch {
        setError("Network error — please try again.");
      }
    });
  };

  if (done) {
    return (
      <div
        className={cn("border-border border-y py-10", className)}
        role="status"
        aria-live="polite"
      >
        <p className="font-semibold text-lg tracking-[-0.025em]">Got it — thank you.</p>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground leading-6">
          Your note is in the queue. If you left an email, we may follow up when it helps.
        </p>
        <Button className="mt-6" onClick={() => setDone(false)} type="button" variant="outline">
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form className={cn("relative space-y-6", className)} noValidate onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="feedback-topic">Topic</Label>
        <select
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          id="feedback-topic"
          name="topic"
          onChange={(event) => setTopic(event.target.value as TopicId)}
          value={topic}
        >
          {TOPICS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-message">Message</Label>
        <Textarea
          id="feedback-message"
          name="message"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What should we know? Be as concrete as you like — model choices, gate ideas, UX nits…"
          required
          rows={6}
          value={message}
        />
        <p className="text-subtle text-xs">10–4,000 characters.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="feedback-name">Name (optional)</Label>
          <Input
            autoComplete="name"
            id="feedback-name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="feedback-email">Email (optional)</Label>
          <Input
            autoComplete="email"
            id="feedback-email"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="so we can reply"
            type="email"
            value={email}
          />
        </div>
      </div>

      {/* Honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden" tabIndex={-1}>
        <Label htmlFor="feedback-website">Website</Label>
        <Input
          autoComplete="off"
          id="feedback-website"
          name="website"
          onChange={(event) => setHoneypot(event.target.value)}
          tabIndex={-1}
          value={honeypot}
        />
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button disabled={pending} type="submit">
          {pending ? "Sending…" : "Send feedback"}
        </Button>
        <p className="text-subtle text-xs leading-5">
          No account required. We store the note and email maintainers when mail is configured.
        </p>
      </div>
    </form>
  );
}
