"use client";

import { Switch } from "@/components/ui/switch";
import { writeNotesShown } from "@/lib/notes-pref";

export function NotesSwitch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (shown: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
      Notes
      <Switch
        checked={checked}
        aria-label="Notes"
        onCheckedChange={(shown) => {
          writeNotesShown(shown);
          onCheckedChange(shown);
        }}
      />
    </label>
  );
}
