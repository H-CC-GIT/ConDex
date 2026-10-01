"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">ConDex</p>
      <h1 className="font-display mt-2 text-3xl font-medium">The deck hit a snag.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {error.message || "Something went wrong while drawing the cards."}
      </p>
      <div className="mt-6">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
