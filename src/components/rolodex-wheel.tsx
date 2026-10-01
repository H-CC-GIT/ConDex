"use client";

import { useEffect, useRef, useState, type AnimationEvent, type ReactNode, type TouchEvent } from "react";
import { CardFace } from "@/components/card-face";
import type { Contact } from "@/lib/types";

type Phase = "raised" | "out" | "in";

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
  const [shown, setShown] = useState<Contact | null>(contact);
  const [phase, setPhase] = useState<Phase>("raised");
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);

  const incomingId = contact?.id ?? null;
  const shownId = shown?.id ?? null;

  if (phase === "raised") {
    if (shownId !== incomingId) {
      if (shown) setPhase("out");
      else if (contact) {
        setShown(contact);
        setPhase("in");
      }
    } else if (contact && contact !== shown) {
      setShown(contact);
    }
  }

  useEffect(() => {
    if (phase === "raised") return;
    const timer = window.setTimeout(() => {
      settle(phase, contact, shown, setShown, setPhase);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [phase, contact, shown]);

  function onAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const name = event.animationName;
    if (phase === "out" && name === "flap-out") settle("out", contact, shown, setShown, setPhase);
    if (phase === "in" && name === "flap-in") settle("in", contact, shown, setShown, setPhase);
  }

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

  const showingCard = shown !== null && (phase !== "raised" || contact !== null);
  const stacked = count > 1;

  return (
    <div className="mx-auto flex w-full max-w-[28rem] flex-col items-center">
      <div
        id="card-wheel"
        role="listbox"
        aria-label="Matching cards"
        className="relative w-full px-10 pt-6 pb-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative" style={{ perspective: "1100px" }}>
        {stacked ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-4 h-full rounded-2xl border border-white/15 bg-white/20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-3 top-2 h-full rounded-2xl border border-white/30 bg-white/50"
            />
          </>
        ) : null}

        <div
          data-lift={phase === "in" ? "down" : "up"}
          className="wheel-lift relative"
        >
          <div
            data-phase={phase === "raised" ? "flat" : phase}
            className="wheel-flap"
            onAnimationEnd={onAnimationEnd}
          >
            {showingCard && shown ? (
              <CardFace
                contact={shown}
                query={query}
                today={today}
                onOpen={() => {
                  if (swiped.current) {
                    swiped.current = false;
                    return;
                  }
                  if (phase === "raised") onOpen();
                }}
              />
            ) : (
              placeholder
            )}
          </div>
        </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none relative z-10 mx-auto mt-3 h-2 w-[min(92%,26rem)] rounded-full bg-white/25 shadow-[0_8px_16px_-10px_rgba(0,0,0,0.8)]"
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

function settle(
  phase: Phase,
  next: Contact | null,
  current: Contact | null,
  setShown: (contact: Contact | null) => void,
  setPhase: (phase: Phase) => void,
) {
  if (phase === "out") {
    setShown(next);
    setPhase(next ? "in" : "raised");
    return;
  }
  if (phase === "in") {
    if (next && current && next.id !== current.id) {
      setPhase("out");
      return;
    }
    setShown(next);
    setPhase("raised");
  }
}
