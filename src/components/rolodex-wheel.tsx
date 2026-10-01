"use client";

import { useEffect, useState, useRef, type ReactNode, type AnimationEvent, type TouchEvent } from "react";
import { CardFace } from "@/components/card-face";
import type { Contact } from "@/lib/types";

export function RolodexWheel({
  contact,
  index,
  count,
  query,
  today,
  nudge,
  onOpen,
  onMove,
  placeholder,
}: {
  contact: Contact | null;
  index: number;
  count: number;
  query: string;
  today: string;
  nudge: number;
  onOpen: () => void;
  onMove: (step: number) => void;
  placeholder?: ReactNode;
}) {
  const [shown, setShown] = useState<Contact | null>(contact);
  const [leaving, setLeaving] = useState<Contact | null>(null);
  const [seenNudge, setSeenNudge] = useState(nudge);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);

  if (nudge !== seenNudge) {
    const delta = nudge - seenNudge;
    setSeenNudge(nudge);
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && shown && contact && shown.id !== contact.id && !leaving) {
      setLeaving(shown);
      setDir(delta > 0 ? "forward" : "back");
      setShown(contact);
    } else {
      setLeaving(null);
      setShown(contact);
    }
  } else if ((contact?.id ?? null) !== (shown?.id ?? null)) {
    setShown(contact);
    setLeaving(null);
  } else if (contact && contact !== shown) {
    setShown(contact);
  }

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(null), 280);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  function onSlideEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    setLeaving(null);
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

  const stacked = count > 1;
  const open = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onOpen();
  };

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
            {leaving ? (
              <div
                aria-hidden
                className="card-slide pointer-events-none absolute inset-0"
                data-motion="out"
                data-dir={dir}
              >
                <CardFace contact={leaving} query={query} today={today} onOpen={() => {}} />
              </div>
            ) : null}
            <div
              className={leaving ? "card-slide" : undefined}
              data-motion={leaving ? "in" : undefined}
              data-dir={dir}
              onAnimationEnd={onSlideEnd}
            >
              {shown ? (
                <CardFace contact={shown} query={query} today={today} onOpen={open} />
              ) : (
                placeholder
              )}
            </div>
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
