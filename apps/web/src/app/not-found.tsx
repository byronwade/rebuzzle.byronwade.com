import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.18em]">404</p>
      <h1 className="mt-3 font-semibold text-3xl text-foreground tracking-[-0.04em] md:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground text-sm leading-6">
        That route doesn&apos;t exist in Rebuzzle. Head home and pick up today&apos;s puzzle.
      </p>
      <Button asChild className="mt-8" size="lg">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
