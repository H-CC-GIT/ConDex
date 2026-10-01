import { Highlight } from "@/components/highlight";
import { formatDay, initials } from "@/lib/format";
import { matchExcerpt } from "@/lib/search-text";
import type { Contact } from "@/lib/types";
import { cn } from "cn";

export function CardFace({
  contact,
  query,
  today,
  onOpen,
}: {
  contact: Contact;
  query: string;
  today: string;
  onOpen: () => void;
}) {
  const place = [contact.organization, contact.city].filter(Boolean).join(" · ");
  const notesExcerpt = query.trim() ? matchExcerpt(contact.notes, query) : null;
  const meetingExcerpt = query.trim()
    ? matchExcerpt(
        contact.meetings.map((meeting) => `${meeting.place} ${meeting.what}`).join(" "),
        query,
      )
    : null;
  const due = Boolean(contact.followUpOn && contact.followUpOn <= today);
  const tab = contact.name.trim().charAt(0).toUpperCase() || "·";

  return (
    <article
      id={`card-${contact.id}`}
      role="option"
      aria-selected
      tabIndex={-1}
      onClick={onOpen}
      className="paper relative flex min-h-[22rem] w-full cursor-pointer flex-col rounded-2xl border border-border bg-card px-5 py-5 text-left text-card-foreground shadow-[0_28px_50px_-28px_rgba(0,0,0,0.9)]"
    >
      <span
        aria-hidden
        className="absolute top-8 right-0 flex h-9 w-8 translate-x-full items-center justify-center rounded-r-md bg-accent text-sm font-medium text-accent-foreground"
      >
        {tab}
      </span>
      <div className="flex items-start gap-3">
        <Portrait contact={contact} />
        <div className="min-w-0 flex-1 pr-2">
          <h2 className="font-display text-2xl leading-tight font-medium tracking-tight">
            <Highlight text={contact.name} query={query} />
          </h2>
          {contact.who ? (
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              <Highlight text={contact.who} query={query} />
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No line yet about who they are.</p>
          )}
        </div>
      </div>

      {place ? (
        <p className="mt-4 text-sm">
          <Highlight text={place} query={query} />
        </p>
      ) : null}

      {contact.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {contact.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              <Highlight text={tag} query={query} />
            </li>
          ))}
        </ul>
      ) : null}

      {contact.introducedByName ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Introduced by <Highlight text={contact.introducedByName} query={query} />
        </p>
      ) : null}

      {contact.followUpOn ? (
        <p className={cn("mt-2 text-xs", due ? "font-medium text-[var(--due)]" : "text-muted-foreground")}>
          {due ? "Due" : "Follow up"} {formatDay(contact.followUpOn)}
        </p>
      ) : null}

      {notesExcerpt ? (
        <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Notes · </span>
          <Highlight text={notesExcerpt} query={query} />
        </p>
      ) : null}

      {meetingExcerpt ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Met · </span>
          <Highlight text={meetingExcerpt} query={query} />
        </p>
      ) : null}
    </article>
  );
}

function Portrait({ contact }: { contact: Contact }) {
  if (contact.photoUrl) {
    return (
      // Photos are private files served by the app, not the image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={contact.photoUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
    );
  }
  return (
    <div
      aria-hidden
      className="font-display flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg text-secondary-foreground"
    >
      {initials(contact.name)}
    </div>
  );
}
