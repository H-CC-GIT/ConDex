"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCard, uploadPhoto } from "@/lib/deck-client";
import { tagsFromText } from "@/lib/format";
import type { Contact } from "@/lib/types";

export function QuickAddDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (contact: Contact) => void;
}) {
  const [name, setName] = useState("");
  const [who, setWho] = useState("");
  const [tags, setTags] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setWho("");
    setTags("");
    setPhoto(null);
    setPreview(null);
    setError("");
    setSaving(false);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let contact = await createCard({
        name,
        who,
        tags: tagsFromText(tags),
      });
      if (photo) {
        try {
          contact = await uploadPhoto(contact.id, photo);
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "The photo could not be saved.";
          onCreated(contact);
          setPhoto(null);
          setPreview(null);
          setError(`${message} The card is in the deck; open it to try the photo again.`);
          setSaving(false);
          return;
        }
      }
      reset();
      onCreated(contact);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The card could not be added.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add a card</DialogTitle>
          <DialogDescription>
            A name, a line about who they are, and any tags you might search for later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-name">Name</Label>
            <Input
              id="add-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              required
              placeholder="Ada Marin"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-who">Who they are</Label>
            <Input
              id="add-who"
              value={who}
              onChange={(event) => setWho(event.target.value)}
              placeholder="Plastics supplier in Lyon"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-tags">Tags</Label>
            <Input
              id="add-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="supplier, lyon"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-photo">Photo</Label>
            <Input
              id="add-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setPhoto(file);
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            {preview ? (
              // Local preview of a file the user just picked.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="size-16 rounded-xl object-cover" />
            ) : (
              <p className="text-xs text-muted-foreground">Optional. JPEG, PNG, WebP, or GIF.</p>
            )}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
