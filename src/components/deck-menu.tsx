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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadExport, importZip } from "@/lib/deck-client";

export function DeckMenu({ onImported }: { onImported: () => void }) {
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuError, setMenuError] = useState("");

  async function onExport() {
    setMenuError("");
    try {
      await downloadExport();
    } catch (caught) {
      setMenuError(caught instanceof Error ? caught.message : "The export didn’t finish.");
    }
  }

  async function onImport(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a ConDex zip first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await importZip(file);
      setFile(null);
      setImportOpen(false);
      onImported();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The import didn’t finish.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid justify-items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>Deck</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void onExport()}>Export zip</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setError("");
              setFile(null);
              setImportOpen(true);
            }}
          >
            Import zip
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {menuError ? (
        <p role="alert" className="max-w-48 text-right text-xs text-destructive">
          {menuError}
        </p>
      ) : null}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Replace the deck</DialogTitle>
            <DialogDescription>
              This replaces every card and photo on this desk with the ones in the zip. Export
              first if you want a copy of what is here now.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onImport} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="import-zip">ConDex zip</Label>
              <Input
                id="import-zip"
                type="file"
                accept="application/zip,.zip"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Replacing…" : "Replace with this file"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
