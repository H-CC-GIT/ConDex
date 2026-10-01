"use client";

import { useEffect, useState, useRef, type ReactNode, type AnimationEvent, type TouchEvent } from "react";
import { CardFace } from "@/components/card-face";
import type { Contact } from "@/lib/types";

export function RolodexWheel({
  contacts,
  index,
  query,
  today,
  nudge,
  showNotes,
  onOpen,
  onMove,
  placeholder,
}: {
  contacts: Contact[];
  index: number;
  query: string;
  today: string;
  nudge: number;
  showNotes: boolean;
  onOpen: (id: string) => void;
  onMove: (step: number) => void;
  placeholder?: ReactNode;
}) {
  const contact = contacts[index] ?? null;
  const count = contacts.length;
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

  const openHero = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (shown) onOpen(shown.id);
  };

  const others = contacts.filter((_, item) => item !== index);

  return (
    <div
      id="card-wheel"
      role="listbox"
      aria-label="Matching cards"
      className="grid w-full grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2"
    >
      <div className="min-w-0">
        <div className="overflow-x-clip" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="relative pr-7">
            {leaving ? (
              <div
                aria-hidden
                className="card-slide pointer-events-none absolute inset-y-0 right-7 left-0"
                data-motion="out"
                data-dir={dir}
              >
                <CardFace
                  contact={leaving}
                  query={query}
                  today={today}
                  onOpen={() => {}}
                  marker={false}
                  showNotes={showNotes}
                />
              </div>
            ) : null}
            <div
              className={leaving ? "card-slide" : undefined}
              data-motion={leaving ? "in" : undefined}
              data-dir={dir}
              onAnimationEnd={onSlideEnd}
            >
              {shown ? (
                <CardFace
                  contact={shown}
                  query={query}
                  today={today}
                  onOpen={openHero}
                  selected
                  showNotes={showNotes}
                />
              ) : (
                placeholder
              )}
            </div>
          </div>
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
      {others.map((person) => (
        <div key={person.id} className="min-w-0 pr-7">
          <CardFace
            contact={person}
            query={query}
            today={today}
            onOpen={() => onOpen(person.id)}
            selected={false}
            showNotes={showNotes}
          />
        </div>
      ))}
    </div>
  );
}
