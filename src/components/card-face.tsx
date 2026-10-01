import { Highlight } from "@/components/highlight";
import { formatDay, initials } from "@/lib/format";
import { matchExcerpt } from "@/lib/search-text";
import type { Contact } from "@/lib/types";

export function CardFace({
  contact,
  query,
  today,
  onOpen,
  selected = true,
  marker = true,
  showNotes = false,
}: {
  contact: Contact;
  query: string;
  today: string;
  onOpen: () => void;
  selected?: boolean;
  marker?: boolean;
  showNotes?: boolean;
}) {
  const place = [contact.organization, contact.city].filter(Boolean).join(" · ");
  const meetingExcerpt = query.trim()
    ? matchExcerpt(
        contact.meetings.map((meeting) => `${meeting.place} ${meeting.what}`).join(" "),
        query,
      )
    : null;
  const notesExcerpt =
    showNotes && !meetingExcerpt && query.trim() ? matchExcerpt(contact.notes, query) : null;
  const excerpt = meetingExcerpt ?? notesExcerpt;
  const due = Boolean(contact.followUpOn && contact.followUpOn <= today);
  const tab = contact.name.trim().charAt(0).toUpperCase() || "·";

  return (
    <article
      id={marker ? `card-${contact.id}` : undefined}
      role={marker ? "option" : undefined}
      aria-selected={marker ? selected : undefined}
      tabIndex={-1}
      onClick={onOpen}
      className="paper relative aspect-[7/4] w-full cursor-pointer rounded-xl border border-border bg-card text-left text-card-foreground shadow-[0_22px_40px_-24px_rgba(0,0,0,0.9)]"
    >
      <span
        aria-hidden
        className="absolute top-1/2 right-0 flex h-7 w-6 -translate-y-1/2 translate-x-full items-center justify-center rounded-r-md bg-accent text-xs font-medium text-accent-foreground"
      >
        {tab}
      </span>
      <div className="flex h-full min-h-0 items-start gap-3 overflow-hidden px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
        <Portrait contact={contact} />
        <div className="min-w-0 flex-1 pr-1">
          <h2 className="font-display truncate text-xl leading-tight font-medium tracking-tight sm:text-2xl">
            <Highlight text={contact.name} query={query} />
          </h2>
          {contact.who ? (
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
              <Highlight text={contact.who} query={query} />
            </p>
          ) : (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">No line yet about who they are.</p>
          )}
          {place ? (
            <p className="mt-2 truncate text-sm">
              <Highlight text={place} query={query} />
            </p>
          ) : null}
          {due && contact.followUpOn ? (
            <p className="mt-1.5 text-xs font-medium text-[var(--due)]">Due {formatDay(contact.followUpOn)}</p>
          ) : null}
          {excerpt ? (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{meetingExcerpt ? "Met" : "Notes"} · </span>
              <Highlight text={excerpt} query={query} />
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Portrait({ contact }: { contact: Contact }) {
  if (contact.photoUrl) {
    return (
      // Photos are private files served by the app, not the image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={contact.photoUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover sm:size-14" />
    );
  }
  return (
    <div
      aria-hidden
      className="font-display flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-base text-secondary-foreground sm:size-14 sm:text-lg"
    >
      {initials(contact.name)}
    </div>
  );
}
