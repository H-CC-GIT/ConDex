"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContactDialog } from "@/components/contact-dialog";
import { Button } from "@/components/ui/button";
import { fetchCard } from "@/lib/deck-client";
import { formatDay, initials } from "@/lib/format";
import type { CardPage, Contact, ContactPoint, RelatedCard } from "@/lib/types";
import { cn } from "cn";

export function CardScreen({ id }: { id: string }) {
  const router = useRouter();
  const [seenId, setSeenId] = useState(id);
  const [page, setPage] = useState<CardPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  if (seenId !== id) {
    setSeenId(id);
    setPage(null);
    setStatus("loading");
    setError("");
    setEditing(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchCard(id)
      .then((data) => {
        if (controller.signal.aborted) return;
        setPage(data);
        setStatus("ready");
        setError("");
      })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(caught instanceof Error ? caught.message : "The card could not be opened.");
      });
    return () => controller.abort();
  }, [id]);

  async function refresh(saved?: Contact) {
    if (saved) {
      setPage((current) => (current ? { ...current, contact: saved } : current));
    }
    try {
      const data = await fetchCard(id);
      setPage(data);
      setStatus("ready");
    } catch {
      if (saved) setStatus("ready");
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
      >
        Back to the deck
      </Link>

      {status === "loading" ? <CardSkeleton /> : null}
      {status === "error" ? (
        <div className="paper mt-8 rounded-2xl border border-border bg-card px-6 py-10 text-card-foreground">
          <h1 className="font-display text-2xl font-medium">The card didn’t open.</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button type="button" className="mt-5" onClick={() => router.push("/")}>
            Back to the deck
          </Button>
        </div>
      ) : null}

      {status === "ready" && page ? (
        editing ? (
          <div className="mt-6">
            <ContactDialog
              inline
              contact={page.contact}
              directory={page.directory}
              onClose={() => setEditing(false)}
              onSaved={(saved) => {
                void refresh(saved);
              }}
              onDone={() => setEditing(false)}
              onDeleted={() => router.push("/")}
            />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-10">
            <ReadingCard contact={page.contact} today={page.today} onEdit={() => setEditing(true)} />
            <Related related={page.related} />
          </div>
        )
      ) : null}
    </div>
  );
}

function ReadingCard({
  contact,
  today,
  onEdit,
}: {
  contact: Contact;
  today: string;
  onEdit: () => void;
}) {
  const place = [contact.organization, contact.city].filter(Boolean).join(" · ");
  const due = Boolean(contact.followUpOn && contact.followUpOn <= today);
  const tab = contact.name.trim().charAt(0).toUpperCase() || "·";
  const [firstMeeting, ...laterMeetings] = contact.meetings;
  const edit = (
    <Button type="button" variant="outline" onClick={onEdit}>
      Edit card
    </Button>
  );

  return (
    <div className="flex flex-col gap-4 pr-10 md:flex-row md:items-start md:gap-12 md:pr-0">
      <article className="paper relative min-w-0 flex-1 rounded-2xl border border-border bg-card px-5 py-5 text-card-foreground shadow-[0_28px_50px_-28px_rgba(0,0,0,0.9)]">
        <span
          aria-hidden
          className="absolute top-8 right-0 flex h-9 w-8 translate-x-full items-center justify-center rounded-r-md bg-accent text-sm font-medium text-accent-foreground"
        >
          {tab}
        </span>
        <div className="flex items-start gap-4">
          <Portrait contact={contact} />
          <div className="min-w-0 flex-1 pr-2">
            <h1 className="font-display text-3xl leading-tight font-medium tracking-tight">{contact.name}</h1>
            {contact.who ? (
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{contact.who}</p>
            ) : null}
            <div className="mt-3 md:hidden">{edit}</div>
          </div>
        </div>

        {place ? <p className="mt-5 text-sm">{place}</p> : null}

        {contact.tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <li key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {contact.introducedByName && contact.introducedById ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Introduced by{" "}
            <Link
              href={`/cards/${contact.introducedById}`}
              className="text-foreground underline decoration-border underline-offset-4"
            >
              {contact.introducedByName}
            </Link>
          </p>
        ) : null}

        {contact.followUpOn ? (
          <p className={cn("mt-2 text-sm", due ? "font-medium text-[var(--due)]" : "text-muted-foreground")}>
            {due ? "Due" : "Follow up"} {formatDay(contact.followUpOn)}
          </p>
        ) : null}

        {contact.points.length > 0 ? (
          <ul className="mt-5 grid gap-2 border-t border-border pt-4">
            {contact.points.map((point) => (
              <PointLine key={point.id} point={point} />
            ))}
          </ul>
        ) : null}

        {firstMeeting ? (
          <section className="mt-5 border-t border-border pt-4">
            <h2 className="text-xs tracking-[0.14em] text-muted-foreground uppercase">How you met</h2>
            <MeetingLine meeting={firstMeeting} />
          </section>
        ) : null}

        {laterMeetings.length > 0 ? (
          <section className="mt-4">
            <h2 className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Later</h2>
            <div className="mt-2 grid gap-3">
              {laterMeetings.map((meeting) => (
                <MeetingLine key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </section>
        ) : null}

        {contact.notes.trim() ? (
          <section className="mt-5 border-t border-border pt-4">
            <h2 className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Notes</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
          </section>
        ) : null}
      </article>
      <div className="hidden md:block">{edit}</div>
    </div>
  );
}

function MeetingLine({
  meeting,
}: {
  meeting: Contact["meetings"][number];
}) {
  const where = [formatDay(meeting.metOn), meeting.place].filter(Boolean).join(" · ");
  return (
    <div className="mt-2">
      {where ? <p className="text-sm">{where}</p> : null}
      {meeting.what ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{meeting.what}</p> : null}
    </div>
  );
}

function PointLine({ point }: { point: ContactPoint }) {
  const href = pointHref(point);
  const label = point.label || kindLabel(point.kind);
  return (
    <li className="text-sm">
      <span className="text-muted-foreground">{label} · </span>
      {href ? (
        <a href={href} className="underline decoration-border underline-offset-4">
          {point.value}
        </a>
      ) : (
        point.value
      )}
    </li>
  );
}

function kindLabel(kind: ContactPoint["kind"]) {
  if (kind === "email") return "Email";
  if (kind === "phone") return "Phone";
  if (kind === "url") return "Link";
  return "Other";
}

function pointHref(point: ContactPoint) {
  if (point.kind === "email") return `mailto:${point.value}`;
  if (point.kind === "phone") {
    const digits = point.value.replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : null;
  }
  if (point.kind === "url") {
    const value = point.value.trim();
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  }
  return null;
}

function Portrait({ contact }: { contact: Contact }) {
  if (contact.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={contact.photoUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
    );
  }
  return (
    <div
      aria-hidden
      className="font-display flex size-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl text-secondary-foreground"
    >
      {initials(contact.name)}
    </div>
  );
}

function Related({ related }: { related: RelatedCard[] }) {
  return (
    <section>
      <h2 className="font-display text-xl font-medium">Who else lines up</h2>
      {related.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No one else in the deck lines up with this card.</p>
      ) : (
        <ul className="mt-4 flex gap-3 overflow-x-auto pr-8 pb-2">
          {related.map((match) => (
            <li key={match.contact.id} className="w-64 shrink-0">
              <Link href={`/cards/${match.contact.id}`} className="block">
                <article className="paper relative aspect-[7/4] rounded-xl border border-border bg-card px-3 py-3 text-card-foreground">
                  <span
                    aria-hidden
                    className="absolute top-1/2 right-0 flex h-6 w-5 -translate-y-1/2 translate-x-full items-center justify-center rounded-r bg-accent text-[0.65rem] font-medium text-accent-foreground"
                  >
                    {match.contact.name.trim().charAt(0).toUpperCase() || "·"}
                  </span>
                  <div className="h-full overflow-hidden">
                    <p className="pr-1 text-xs text-accent">{match.reason}</p>
                    <h3 className="font-display mt-1 truncate text-lg leading-tight font-medium">{match.contact.name}</h3>
                    {match.contact.who ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{match.contact.who}</p>
                    ) : null}
                  </div>
                </article>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CardSkeleton() {
  return (
    <div
      className="paper mt-8 flex min-h-[22rem] w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card px-6 py-8"
      aria-hidden
    >
      <div className="h-7 w-2/3 rounded-md bg-foreground/10" />
      <div className="h-4 w-1/2 rounded-md bg-foreground/10" />
      <div className="mt-8 h-4 w-full rounded-md bg-foreground/10" />
      <div className="h-4 w-5/6 rounded-md bg-foreground/10" />
    </div>
  );
}
