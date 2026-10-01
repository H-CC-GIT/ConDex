"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { removeCard, removePhoto, saveCard, uploadPhoto } from "@/lib/deck-client";
import { initials, tagsFromText } from "@/lib/format";
import type { Contact, DirectoryEntry, MeetingInput, PointInput, PointKind } from "@/lib/types";

const controlClass =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Draft = {
  name: string;
  who: string;
  organization: string;
  city: string;
  notes: string;
  tags: string;
  introducedById: string;
  followUpOn: string;
  points: PointInput[];
  meetings: MeetingInput[];
};

function fromContact(contact: Contact): Draft {
  return {
    name: contact.name,
    who: contact.who,
    organization: contact.organization,
    city: contact.city,
    notes: contact.notes,
    tags: contact.tags.join(", "),
    introducedById: contact.introducedById ?? "",
    followUpOn: contact.followUpOn ?? "",
    points: contact.points.map(({ kind, value, label }) => ({ kind, value, label })),
    meetings: contact.meetings.map(({ metOn, place, what }) => ({ metOn, place, what })),
  };
}

export function ContactDialog({
  contact,
  directory,
  onClose,
  onSaved,
  onDeleted,
}: {
  contact: Contact | null;
  directory: DirectoryEntry[];
  onClose: () => void;
  onSaved: (contact: Contact) => void;
  onDeleted: (id: string) => void;
}) {
  const contactId = contact?.id ?? null;
  const [formId, setFormId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  if (contactId !== formId) {
    setFormId(contactId);
    setDraft(contact ? fromContact(contact) : null);
    setError("");
    setPhotoError("");
    setSaving(false);
    setConfirmRemove(false);
  }

  function patch(partial: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!contact || !draft) return;
    setSaving(true);
    setError("");
    try {
      const saved = await saveCard(contact.id, {
        name: draft.name,
        who: draft.who,
        organization: draft.organization,
        city: draft.city,
        notes: draft.notes,
        tags: tagsFromText(draft.tags),
        introducedById: draft.introducedById || null,
        followUpOn: draft.followUpOn || null,
        points: draft.points,
        meetings: draft.meetings,
      });
      setDraft(fromContact(saved));
      onSaved(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The card could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(file: File | null) {
    if (!contact || !file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const saved = await uploadPhoto(contact.id, file);
      onSaved(saved);
    } catch (caught) {
      setPhotoError(caught instanceof Error ? caught.message : "The photo could not be saved.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onClearPhoto() {
    if (!contact) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const saved = await removePhoto(contact.id);
      onSaved(saved);
    } catch (caught) {
      setPhotoError(caught instanceof Error ? caught.message : "The photo could not be removed.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onRemove() {
    if (!contact) return;
    setSaving(true);
    setError("");
    try {
      await removeCard(contact.id);
      onDeleted(contact.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The card could not be removed.");
      setSaving(false);
    }
  }

  const others = directory.filter((entry) => entry.id !== contact?.id);

  return (
    <Dialog open={Boolean(contact)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92dvh,900px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl max-sm:h-[100dvh] max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0">
        {contact && draft ? (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="px-5 pt-5 pr-12">
              <DialogTitle className="font-display text-2xl">{draft.name || contact.name}</DialogTitle>
              <DialogDescription>
                The full card: how you reach them, how you met, and who introduced you.
              </DialogDescription>
            </DialogHeader>
            <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-5 py-4 md:grid-cols-2">
              <div className="grid content-start gap-4">
                <div className="flex items-center gap-3">
                  {contact.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={contact.photoUrl}
                      alt=""
                      className="size-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="font-display flex size-20 items-center justify-center rounded-2xl bg-secondary text-2xl">
                      {initials(contact.name)}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="card-photo" className="text-xs text-muted-foreground">
                      Photo saves as soon as you choose a file.
                    </Label>
                    <Input
                      id="card-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={photoBusy}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void onPhoto(file);
                        event.target.value = "";
                      }}
                    />
                    {contact.photoUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={photoBusy}
                        onClick={() => void onClearPhoto()}
                      >
                        Remove photo
                      </Button>
                    ) : null}
                    {photoError ? (
                      <p role="alert" className="text-sm text-destructive">
                        {photoError}
                      </p>
                    ) : null}
                  </div>
                </div>

                <Field label="Name" id="card-name">
                  <Input
                    id="card-name"
                    value={draft.name}
                    onChange={(event) => patch({ name: event.target.value })}
                    required
                  />
                </Field>
                <Field label="Who they are" id="card-who">
                  <Input
                    id="card-who"
                    value={draft.who}
                    onChange={(event) => patch({ who: event.target.value })}
                    placeholder="Plastics supplier in Lyon"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Organization" id="card-org">
                    <Input
                      id="card-org"
                      value={draft.organization}
                      onChange={(event) => patch({ organization: event.target.value })}
                    />
                  </Field>
                  <Field label="City" id="card-city">
                    <Input
                      id="card-city"
                      value={draft.city}
                      onChange={(event) => patch({ city: event.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Tags" id="card-tags">
                  <Input
                    id="card-tags"
                    value={draft.tags}
                    onChange={(event) => patch({ tags: event.target.value })}
                    placeholder="supplier, lyon"
                  />
                </Field>
                <Field label="Introduced by" id="card-intro">
                  <select
                    id="card-intro"
                    className={controlClass}
                    value={draft.introducedById}
                    onChange={(event) => patch({ introducedById: event.target.value })}
                  >
                    <option value="">No one</option>
                    {others.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Follow up" id="card-follow">
                  <Input
                    id="card-follow"
                    type="date"
                    value={draft.followUpOn}
                    onChange={(event) => patch({ followUpOn: event.target.value })}
                  />
                </Field>
              </div>

              <div className="grid content-start gap-4">
                <section className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">How to reach them</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        patch({
                          points: [...draft.points, { kind: "email", value: "", label: "" }],
                        })
                      }
                    >
                      Add a point
                    </Button>
                  </div>
                  {draft.points.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No phone, email, or link yet.</p>
                  ) : (
                    draft.points.map((point, index) => (
                      <div key={index} className="grid gap-2 sm:grid-cols-[6.5rem_1fr_auto]">
                        <select
                          aria-label="Kind of contact point"
                          className={controlClass}
                          value={point.kind}
                          onChange={(event) => {
                            const points = draft.points.slice();
                            points[index] = {
                              ...point,
                              kind: event.target.value as PointKind,
                            };
                            patch({ points });
                          }}
                        >
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="url">Link</option>
                          <option value="other">Other</option>
                        </select>
                        <Input
                          aria-label="Contact point"
                          value={point.value}
                          placeholder={point.kind === "phone" ? "Phone number" : "Address or link"}
                          onChange={(event) => {
                            const points = draft.points.slice();
                            points[index] = { ...point, value: event.target.value };
                            patch({ points });
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            patch({ points: draft.points.filter((_, item) => item !== index) })
                          }
                        >
                          Remove
                        </Button>
                        <Input
                          aria-label="Label"
                          className="col-span-full"
                          value={point.label}
                          placeholder="Label, such as work or mobile"
                          onChange={(event) => {
                            const points = draft.points.slice();
                            points[index] = { ...point, label: event.target.value };
                            patch({ points });
                          }}
                        />
                      </div>
                    ))
                  )}
                </section>

                <Separator />

                <Field label="Notes" id="card-notes">
                  <Textarea
                    id="card-notes"
                    value={draft.notes}
                    onChange={(event) => patch({ notes: event.target.value })}
                    className="min-h-24"
                  />
                </Field>

                <section className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium">Meetings</h3>
                      <p className="text-xs text-muted-foreground">The first one is how you met.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        patch({
                          meetings: [...draft.meetings, { metOn: "", place: "", what: "" }],
                        })
                      }
                    >
                      Add a meeting
                    </Button>
                  </div>
                  {draft.meetings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No meetings yet.</p>
                  ) : (
                    draft.meetings.map((meeting, index) => (
                      <div key={index} className="grid gap-2 rounded-xl border border-border p-3">
                        <div className="grid gap-2 sm:grid-cols-[9rem_1fr_auto]">
                          <Input
                            aria-label="Meeting date"
                            type="date"
                            value={meeting.metOn}
                            onChange={(event) => {
                              const meetings = draft.meetings.slice();
                              meetings[index] = { ...meeting, metOn: event.target.value };
                              patch({ meetings });
                            }}
                          />
                          <Input
                            aria-label="Meeting place"
                            value={meeting.place}
                            placeholder="Place"
                            onChange={(event) => {
                              const meetings = draft.meetings.slice();
                              meetings[index] = { ...meeting, place: event.target.value };
                              patch({ meetings });
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              patch({
                                meetings: draft.meetings.filter((_, item) => item !== index),
                              })
                            }
                          >
                            Remove
                          </Button>
                        </div>
                        <Textarea
                          aria-label="What happened"
                          value={meeting.what}
                          placeholder="What happened"
                          onChange={(event) => {
                            const meetings = draft.meetings.slice();
                            meetings[index] = { ...meeting, what: event.target.value };
                            patch({ meetings });
                          }}
                        />
                      </div>
                    ))
                  )}
                </section>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              {confirmRemove ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm">
                    Remove {contact.name} from the deck? The photo and meetings go too.
                  </p>
                  <Button type="button" variant="destructive" disabled={saving} onClick={() => void onRemove()}>
                    Remove card
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setConfirmRemove(false)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setConfirmRemove(true)}>
                  Remove card
                </Button>
              )}
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save card"}
                </Button>
              </div>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
