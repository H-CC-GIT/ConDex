"use client";

import { useRef, type ReactNode, type TouchEvent } from "react";
import { CardFace } from "@/components/card-face";
import type { Contact } from "@/lib/types";

export function RolodexWheel({
  contact,
  index,
  count,
  query,
  today,
  onOpen,
  onMove,
  placeholder,
}: {
  contact: Contact | null;
  index: number;
  count: number;
  query: string;
  today: string;
  onOpen: () => void;
  onMove: (step: number) => void;
  placeholder?: ReactNode;
}) {
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);
  const stacked = count > 1;

  function onTouchStart(event: TouchEvent) {
    touchX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent) {
    if (touchX.current == null || count < 2) return;
    const end = event.changedTouches[0]?.clientX;
    if (end == null) return;
    const delta = end - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) < 48) return;
    swiped.current = true;
    onMove(delta < 0 ? 1 : -1);
  }

  return (
    <div className="mx-auto flex w-full max-w-[36rem] flex-col items-center">
      <div
        id="card-wheel"
        role="listbox"
        aria-label="Matching cards"
        className="relative w-full px-8 pt-4 pb-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative">
          {stacked ? (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-3 h-full rounded-xl border border-white/15 bg-white/20"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-3 top-1.5 h-full rounded-xl border border-white/30 bg-white/50"
              />
            </>
          ) : null}
          <div className="relative -translate-y-2">
            {contact ? (
              <CardFace
                contact={contact}
                query={query}
                today={today}
                onOpen={() => {
                  if (swiped.current) {
                    swiped.current = false;
                    return;
                  }
                  onOpen();
                }}
              />
            ) : (
              placeholder
            )}
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none relative z-10 mx-auto mt-3 h-1.5 w-[min(88%,24rem)] rounded-full bg-white/25 shadow-[0_8px_16px_-10px_rgba(0,0,0,0.8)]"
        />
      </div>

      {count > 0 ? (
        <p className="mt-3 text-sm tabular-nums tracking-wide text-foreground/80" aria-live="polite">
          <span className="text-accent">{index + 1}</span>
          <span className="px-1.5 text-foreground/40">/</span>
          {count}
        </p>
      ) : (
        <p className="mt-3 h-5" aria-hidden />
      )}
    </div>
  );
}
