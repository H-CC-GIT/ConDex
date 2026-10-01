"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DeckMenu } from "@/components/deck-menu";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { RolodexWheel } from "@/components/rolodex-wheel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchDeck } from "@/lib/deck-client";
import type { Deck } from "@/lib/types";

export function Rolodex() {
  const [query, setQuery] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const seenDeck = useRef(false);
  const preferId = useRef<string | null>(null);

  const load = useCallback(async (nextQuery: string, nextDue: boolean) => {
    const id = ++requestId.current;
    setPending(true);
    try {
      const data = await fetchDeck(nextQuery, nextDue);
      if (id !== requestId.current) return;
      seenDeck.current = true;
      setDeck(data);
      setStatus("ready");
      setLoadError("");
      setSearchError("");
    } catch (caught) {
      if (id !== requestId.current) return;
      const message = caught instanceof Error ? caught.message : "The deck could not finish that.";
      if (!seenDeck.current) {
        setStatus("error");
        setLoadError(message);
      } else {
        setSearchError(message);
      }
    } finally {
      if (id === requestId.current) setPending(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load(query, dueOnly);
    }, seenDeck.current ? 120 : 0);
    return () => window.clearTimeout(handle);
  }, [query, dueOnly, load]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!deck || !preferId.current) return;
    const index = deck.contacts.findIndex((contact) => contact.id === preferId.current);
    if (index >= 0) setSelected(index);
    preferId.current = null;
  }, [deck]);

  const contacts = deck?.contacts ?? [];
  const count = contacts.length;
  const safeSelected = count === 0 ? 0 : Math.min(selected, count - 1);
  const active = contacts[safeSelected];

  const move = useCallback(
    (step: number) => {
      if (count === 0) return;
      setSelected((index) => {
        const current = Math.min(index, count - 1);
        return (current + step + count) % count;
      });
    },
    [count],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        Boolean(target?.isContentEditable);
      const inSearch = target === searchRef.current;
      const dialogOpen = addOpen;

      if (event.key === "Escape" && !dialogOpen && inSearch) {
        searchRef.current?.blur();
        return;
      }
      if (dialogOpen) return;

      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        move(event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1);
        return;
      }

      if (event.key === "Enter" && inSearch) {
        event.preventDefault();
        if (active) router.push(`/cards/${active.id}`);
        return;
      }

      const addKey = event.code === "KeyN" && !event.metaKey && !event.ctrlKey && !event.shiftKey;
      if (addKey && (event.altKey || !typing)) {
        event.preventDefault();
        setAddOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, active, move, router]);

  function focusSearch() {
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  const due = deck?.due ?? [];
  const today = deck?.today ?? "";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Personal rolodex</p>
          <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">ConDex</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Find someone the way you remember them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add a card
            <kbd className="rounded bg-primary-foreground/15 px-1.5 py-0.5 text-[0.7rem]">Alt N</kbd>
          </Button>
          <DeckMenu
            onImported={() => {
              preferId.current = null;
              void load(query, dueOnly);
            }}
          />
        </div>
      </header>

      <div className="mt-6 grid gap-2">
        <label htmlFor="deck-search" className="text-sm font-medium">
          Search
        </label>
        <Input
          id="deck-search"
          ref={searchRef}
          role="combobox"
          aria-expanded
          aria-controls="card-wheel"
          aria-autocomplete="list"
          aria-activedescendant={active ? `card-${active.id}` : undefined}
          value={query}
          autoFocus
          placeholder="A name, a city, plastics supplier…"
          className="h-12 px-3 text-base"
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
        />
        <p className="text-xs text-muted-foreground">
          {pending ? "Looking through the deck…" : "Arrows move the cards. Enter opens one. Alt N adds."}
        </p>
      </div>

      {status === "ready" && due.length > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {dueOnly ? (
            <>
              Showing cards that are due.{" "}
              <button
                type="button"
                className="underline decoration-border underline-offset-4 hover:text-foreground"
                onClick={() => {
                  setDueOnly(false);
                  setSelected(0);
                }}
              >
                Show the whole deck
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-left underline decoration-border underline-offset-4 hover:text-foreground"
              onClick={() => {
                setDueOnly(true);
                setSelected(0);
              }}
            >
              {due.length === 1
                ? `Follow up with ${due[0].name}.`
                : `${due.length} people are due for a follow-up.`}
            </button>
          )}
        </p>
      ) : null}

      {searchError ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 px-4 py-3 text-sm" role="alert">
          <p>{searchError}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void load(query, dueOnly)}>
            Try again
          </Button>
        </div>
      ) : null}

      <main className="mt-6 flex min-h-0 flex-1 flex-col" aria-busy={status === "loading" || pending}>
        <RolodexWheel
          contact={status === "ready" ? (active ?? null) : null}
          index={safeSelected}
          count={status === "ready" ? count : 0}
          query={query}
          today={today}
          onOpen={() => {
            if (active) router.push(`/cards/${active.id}`);
          }}
          onMove={move}
          placeholder={
            status === "loading" ? (
              <SkeletonCard />
            ) : status === "error" ? (
              <StageCard
                title="The deck didn’t open."
                body={loadError || "Something went wrong while reading the cards."}
                action={
                  <Button type="button" onClick={() => void load(query, dueOnly)}>
                    Try again
                  </Button>
                }
              />
            ) : (
              <StageCard
                title={emptyTitle(query, dueOnly)}
                body={emptyBody(query, dueOnly, (deck?.directory.length ?? 0) === 0)}
                action={
                  (deck?.directory.length ?? 0) === 0 ? (
                    <Button type="button" onClick={() => setAddOpen(true)}>
                      Add a card
                    </Button>
                  ) : dueOnly ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDueOnly(false);
                        setSelected(0);
                      }}
                    >
                      Show the whole deck
                    </Button>
                  ) : null
                }
              />
            )
          }
        />
        {status === "ready" ? (
          <p className="sr-only" aria-live="polite">
            {contacts.length === 0
              ? "No cards in view."
              : `${contacts.length} ${contacts.length === 1 ? "card" : "cards"} in view.`}
          </p>
        ) : null}
      </main>

      <QuickAddDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) focusSearch();
        }}
        onCreated={(contact) => {
          setAddOpen(false);
          preferId.current = contact.id;
          if (query === "" && !dueOnly) void load("", false);
          else {
            setQuery("");
            setDueOnly(false);
          }
          focusSearch();
        }}
      />
    </div>
  );
}

function emptyTitle(query: string, dueOnly: boolean) {
  if (query.trim() && dueOnly) return `No due card matches “${query.trim()}”.`;
  if (query.trim()) return `No card matches “${query.trim()}”.`;
  if (dueOnly) return "Nobody is due.";
  return "The desk is clear.";
}

function emptyBody(query: string, dueOnly: boolean, deskEmpty: boolean) {
  if (deskEmpty) {
    return "Add someone the way you remember them: a name, a line about who they are, and a tag.";
  }
  if (query.trim()) {
    return "A shorter piece of the word still counts, so plast finds plastics.";
  }
  if (dueOnly) return "Follow-up dates that are today or earlier show up here.";
  return "The desk is clear.";
}

function StageCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="paper flex min-h-[22rem] w-full flex-col justify-center rounded-2xl border border-border bg-card px-6 py-8 text-card-foreground shadow-[0_28px_50px_-28px_rgba(0,0,0,0.9)]">
      <h2 className="font-display text-2xl font-medium wrap-anywhere">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="paper flex min-h-[22rem] w-full flex-col gap-4 rounded-2xl border border-border bg-card px-6 py-8"
      aria-hidden
    >
      <div className="h-6 w-2/3 rounded-md bg-foreground/10" />
      <div className="h-4 w-1/2 rounded-md bg-foreground/10" />
      <div className="mt-8 h-4 w-full rounded-md bg-foreground/10" />
      <div className="h-4 w-5/6 rounded-md bg-foreground/10" />
    </div>
  );
}
