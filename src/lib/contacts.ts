import crypto from "crypto";
import fs from "fs";
import path from "path";
import { apiUrl } from "./base-path";
import { getDb } from "./db";
import { dataDir, photosDir } from "./paths";
import type {
  Contact,
  ContactInput,
  Deck,
  DirectoryEntry,
  DueEntry,
  Meeting,
  MeetingInput,
  PointInput,
  PointKind,
} from "./types";
import { POINT_KINDS } from "./types";

const KINDS = new Set<string>(POINT_KINDS);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export class DeckError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function todayISO(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function cleanText(value: unknown, max: number, label: string) {
  if (value == null) return "";
  if (typeof value !== "string") throw new DeckError(400, `${label} should be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new DeckError(400, `${label} is too long.`);
  return trimmed;
}

function isISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function optionalDate(value: unknown, label: string) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !isISODate(value)) {
    throw new DeckError(400, `${label} needs a real calendar day.`);
  }
  return value;
}

function normalizeTags(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new DeckError(400, "Tags should be a list.");
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") throw new DeckError(400, "Each tag should be text.");
    const name = item.trim().replace(/\s+/g, " ");
    if (!name) continue;
    if (name.length > 40) throw new DeckError(400, "Keep each tag under 40 characters.");
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(name);
  }
  if (tags.length > 24) throw new DeckError(400, "That card has too many tags.");
  return tags;
}

function normalizePoints(value: unknown): PointInput[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new DeckError(400, "Contact points should be a list.");
  const points: PointInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") throw new DeckError(400, "A contact point is missing.");
    const record = item as Record<string, unknown>;
    const kind = typeof record.kind === "string" ? record.kind : "other";
    if (!KINDS.has(kind)) throw new DeckError(400, "Unknown kind of contact point.");
    const pointValue = cleanText(record.value, 400, "A contact point");
    const label = cleanText(record.label, 80, "A contact point label");
    if (!pointValue) continue;
    points.push({ kind: kind as PointKind, value: pointValue, label });
  }
  if (points.length > 30) throw new DeckError(400, "That card has too many contact points.");
  return points;
}

function normalizeMeetings(value: unknown): MeetingInput[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new DeckError(400, "Meetings should be a list.");
  const meetings: MeetingInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") throw new DeckError(400, "A meeting is missing.");
    const record = item as Record<string, unknown>;
    const metOn = optionalDate(record.metOn, "A meeting date");
    const place = cleanText(record.place, 200, "A meeting place");
    const what = cleanText(record.what, 4000, "What happened");
    if (!metOn && !place && !what) continue;
    if (!metOn) throw new DeckError(400, "Each meeting needs a date.");
    meetings.push({ metOn, place, what });
  }
  if (meetings.length > 200) throw new DeckError(400, "That card has too many meetings.");
  return meetings;
}

export function ftsQuery(raw: string) {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((token) =>
      token
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^\p{L}\p{N}_'-]/gu, ""),
    )
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((token) => `"${token.replaceAll('"', "")}"*`).join(" AND ");
}

type ContactRow = {
  id: string;
  name: string;
  who: string;
  organization: string;
  city: string;
  notes: string;
  photo_file: string | null;
  introduced_by_id: string | null;
  introduced_by_name: string | null;
  follow_up_on: string | null;
  created_at: string;
  updated_at: string;
};

function photoUrl(id: string, photoFile: string | null, updatedAt: string) {
  if (!photoFile) return null;
  return apiUrl(`/api/photos/${id}?v=${encodeURIComponent(updatedAt)}`);
}

function hydrate(ids: string[]): Contact[] {
  if (ids.length === 0) return [];
  const db = getDb();
  const marks = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.who, c.organization, c.city, c.notes, c.photo_file,
              c.introduced_by_id, i.name AS introduced_by_name, c.follow_up_on,
              c.created_at, c.updated_at
       FROM contacts c
       LEFT JOIN contacts i ON i.id = c.introduced_by_id
       WHERE c.id IN (${marks})`,
    )
    .all(...ids) as ContactRow[];

  const tagRows = db
    .prepare(
      `SELECT ct.contact_id, t.name
       FROM contact_tags ct
       JOIN tags t ON t.id = ct.tag_id
       WHERE ct.contact_id IN (${marks})
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all(...ids) as { contact_id: string; name: string }[];

  const pointRows = db
    .prepare(
      `SELECT id, contact_id, kind, value, label
       FROM contact_points
       WHERE contact_id IN (${marks})
       ORDER BY position, rowid`,
    )
    .all(...ids) as {
    id: string;
    contact_id: string;
    kind: PointKind;
    value: string;
    label: string;
  }[];

  const meetingRows = db
    .prepare(
      `SELECT id, contact_id, met_on, place, what
       FROM meetings
       WHERE contact_id IN (${marks})
       ORDER BY position, met_on, rowid`,
    )
    .all(...ids) as {
    id: string;
    contact_id: string;
    met_on: string;
    place: string;
    what: string;
  }[];

  const tags = new Map<string, string[]>();
  for (const row of tagRows) {
    const list = tags.get(row.contact_id) ?? [];
    list.push(row.name);
    tags.set(row.contact_id, list);
  }
  const points = new Map<string, Contact["points"]>();
  for (const row of pointRows) {
    const list = points.get(row.contact_id) ?? [];
    list.push({ id: row.id, kind: row.kind, value: row.value, label: row.label });
    points.set(row.contact_id, list);
  }
  const meetings = new Map<string, Meeting[]>();
  for (const row of meetingRows) {
    const list = meetings.get(row.contact_id) ?? [];
    list.push({ id: row.id, metOn: row.met_on, place: row.place, what: row.what });
    meetings.set(row.contact_id, list);
  }

  const byId = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        who: row.who,
        organization: row.organization,
        city: row.city,
        notes: row.notes,
        photoUrl: photoUrl(row.id, row.photo_file, row.updated_at),
        introducedById: row.introduced_by_id,
        introducedByName: row.introduced_by_name,
        followUpOn: row.follow_up_on,
        tags: tags.get(row.id) ?? [],
        points: points.get(row.id) ?? [],
        meetings: meetings.get(row.id) ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } satisfies Contact,
    ]),
  );

  return ids.flatMap((id) => {
    const contact = byId.get(id);
    return contact ? [contact] : [];
  });
}

export function getContact(id: string) {
  return hydrate([id])[0] ?? null;
}

export function listDeck(rawQuery: string, dueOnly: boolean): Deck {
  if (rawQuery.length > 200) throw new DeckError(400, "That search is too long.");
  const db = getDb();
  const today = todayISO();
  const typed = rawQuery.trim();
  const match = typed ? ftsQuery(typed) : null;
  let ids: string[];

  if (typed && !match) {
    ids = [];
  } else if (match) {
    const sql = `
      SELECT contacts_fts.contact_id AS id
      FROM contacts_fts
      JOIN contacts c ON c.id = contacts_fts.contact_id
      WHERE contacts_fts MATCH ?
      ${dueOnly ? "AND c.follow_up_on IS NOT NULL AND c.follow_up_on <= ?" : ""}
      ORDER BY rank
    `;
    const rows = (
      dueOnly ? db.prepare(sql).all(match, today) : db.prepare(sql).all(match)
    ) as { id: string }[];
    ids = rows.map((row) => row.id);
  } else {
    const sql = `
      SELECT id FROM contacts
      ${dueOnly ? "WHERE follow_up_on IS NOT NULL AND follow_up_on <= ?" : ""}
      ORDER BY name COLLATE NOCASE
    `;
    const rows = (dueOnly ? db.prepare(sql).all(today) : db.prepare(sql).all()) as {
      id: string;
    }[];
    ids = rows.map((row) => row.id);
  }

  return {
    today,
    contacts: hydrate(ids),
    directory: db
      .prepare("SELECT id, name FROM contacts ORDER BY name COLLATE NOCASE")
      .all() as DirectoryEntry[],
    due: db
      .prepare(
        `SELECT id, name, follow_up_on AS followUpOn
         FROM contacts
         WHERE follow_up_on IS NOT NULL AND follow_up_on <= ?
         ORDER BY follow_up_on, name COLLATE NOCASE`,
      )
      .all(today) as DueEntry[],
  };
}

function resolveIntroducer(id: string, introducedById: unknown) {
  if (introducedById == null || introducedById === "") return null;
  if (typeof introducedById !== "string") {
    throw new DeckError(400, "Introduced-by should point at another card.");
  }
  if (introducedById === id) {
    throw new DeckError(400, "A person cannot introduce themselves.");
  }
  const row = getDb().prepare("SELECT id FROM contacts WHERE id = ?").get(introducedById);
  if (!row) throw new DeckError(400, "The person who introduced them is not in the deck.");
  return introducedById;
}

function setTags(contactId: string, names: string[]) {
  const db = getDb();
  db.prepare("DELETE FROM contact_tags WHERE contact_id = ?").run(contactId);
  const find = db.prepare("SELECT id FROM tags WHERE name = ? COLLATE NOCASE");
  const insertTag = db.prepare("INSERT INTO tags (id, name) VALUES (?, ?)");
  const link = db.prepare(
    "INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)",
  );
  for (const name of names) {
    let tag = find.get(name) as { id: string } | undefined;
    if (!tag) {
      const tagId = crypto.randomUUID();
      insertTag.run(tagId, name);
      tag = { id: tagId };
    }
    link.run(contactId, tag.id);
  }
  db.prepare("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM contact_tags)").run();
}

function indexContact(id: string) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT c.name, c.who, c.organization, c.city, c.notes, i.name AS introducer
       FROM contacts c
       LEFT JOIN contacts i ON i.id = c.introduced_by_id
       WHERE c.id = ?`,
    )
    .get(id) as
    | {
        name: string;
        who: string;
        organization: string;
        city: string;
        notes: string;
        introducer: string | null;
      }
    | undefined;

  db.prepare("DELETE FROM contacts_fts WHERE contact_id = ?").run(id);
  if (!row) return;

  const tags = (
    db
      .prepare(
        `SELECT t.name FROM tags t
         JOIN contact_tags ct ON ct.tag_id = t.id
         WHERE ct.contact_id = ?`,
      )
      .all(id) as { name: string }[]
  )
    .map((tag) => tag.name)
    .join(" ");

  const meetings = (
    db
      .prepare("SELECT met_on, place, what FROM meetings WHERE contact_id = ?")
      .all(id) as { met_on: string; place: string; what: string }[]
  )
    .map((meeting) => `${meeting.met_on} ${meeting.place} ${meeting.what}`)
    .join("\n");

  db.prepare(
    `INSERT INTO contacts_fts
      (contact_id, name, who, organization, city, notes, tags, meetings, introducer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    row.name,
    row.who,
    row.organization,
    row.city,
    row.notes,
    tags,
    meetings,
    row.introducer ?? "",
  );
}

function reindexIntroduced(id: string) {
  const rows = getDb()
    .prepare("SELECT id FROM contacts WHERE introduced_by_id = ?")
    .all(id) as { id: string }[];
  for (const row of rows) indexContact(row.id);
}

function applyWrite(
  id: string,
  input: ContactInput,
  createdAt: string,
  updatedAt: string,
  isNew: boolean,
) {
  const db = getDb();
  const name = cleanText(input.name, 200, "Name");
  if (!name) throw new DeckError(400, "Add a name first.");
  const who = cleanText(input.who, 500, "Who they are");
  const organization = cleanText(input.organization, 200, "Organization");
  const city = cleanText(input.city, 120, "City");
  const notes = cleanText(input.notes, 20000, "Notes");
  const followUpOn = optionalDate(input.followUpOn, "The follow-up date");
  const introducedById = resolveIntroducer(id, input.introducedById);
  const tags = normalizeTags(input.tags);
  const points = normalizePoints(input.points);
  const meetings = normalizeMeetings(input.meetings);

  if (isNew) {
    db.prepare(
      `INSERT INTO contacts
        (id, name, who, organization, city, notes, photo_file, introduced_by_id, follow_up_on, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    ).run(
      id,
      name,
      who,
      organization,
      city,
      notes,
      introducedById,
      followUpOn,
      createdAt,
      updatedAt,
    );
  } else {
    db.prepare(
      `UPDATE contacts
       SET name = ?, who = ?, organization = ?, city = ?, notes = ?,
           introduced_by_id = ?, follow_up_on = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      name,
      who,
      organization,
      city,
      notes,
      introducedById,
      followUpOn,
      updatedAt,
      id,
    );
  }

  setTags(id, tags);
  db.prepare("DELETE FROM contact_points WHERE contact_id = ?").run(id);
  const insertPoint = db.prepare(
    "INSERT INTO contact_points (id, contact_id, kind, value, label, position) VALUES (?, ?, ?, ?, ?, ?)",
  );
  points.forEach((point, index) => {
    insertPoint.run(crypto.randomUUID(), id, point.kind, point.value, point.label, index);
  });

  db.prepare("DELETE FROM meetings WHERE contact_id = ?").run(id);
  const insertMeeting = db.prepare(
    "INSERT INTO meetings (id, contact_id, met_on, place, what, position) VALUES (?, ?, ?, ?, ?, ?)",
  );
  meetings.forEach((meeting, index) => {
    insertMeeting.run(
      crypto.randomUUID(),
      id,
      meeting.metOn,
      meeting.place,
      meeting.what,
      index,
    );
  });

  indexContact(id);
}

export function createContact(input: ContactInput) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb().transaction(() => {
    applyWrite(id, input, now, now, true);
  })();
  const contact = getContact(id);
  if (!contact) throw new DeckError(500, "The card was saved but could not be read back.");
  return contact;
}

export function updateContact(id: string, input: ContactInput) {
  const existing = getDb()
    .prepare("SELECT created_at FROM contacts WHERE id = ?")
    .get(id) as { created_at: string } | undefined;
  if (!existing) throw new DeckError(404, "That card is no longer in the deck.");
  const now = new Date().toISOString();
  getDb().transaction(() => {
    applyWrite(id, input, existing.created_at, now, false);
    reindexIntroduced(id);
  })();
  const contact = getContact(id);
  if (!contact) throw new DeckError(500, "The card was saved but could not be read back.");
  return contact;
}

function safePhotoName(filename: string) {
  return /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i.test(filename);
}

function removePhotoFile(filename: string | null) {
  if (!filename || !safePhotoName(filename)) return;
  const full = path.resolve(/*turbopackIgnore: true*/ photosDir(), filename);
  if (!full.startsWith(`${path.resolve(/*turbopackIgnore: true*/ photosDir())}${path.sep}`)) return;
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

export function deleteContact(id: string) {
  const db = getDb();
  const existing = db.prepare("SELECT photo_file FROM contacts WHERE id = ?").get(id) as
    | { photo_file: string | null }
    | undefined;
  if (!existing) throw new DeckError(404, "That card is no longer in the deck.");
  const dependents = db
    .prepare("SELECT id FROM contacts WHERE introduced_by_id = ?")
    .all(id) as { id: string }[];
  db.transaction(() => {
    db.prepare("DELETE FROM contacts_fts WHERE contact_id = ?").run(id);
    db.prepare("DELETE FROM contacts WHERE id = ?").run(id);
    db.prepare("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM contact_tags)").run();
    for (const row of dependents) indexContact(row.id);
  })();
  removePhotoFile(existing.photo_file);
}

export function sniffImage(buf: Buffer) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: ".jpg", mime: "image/jpeg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { ext: ".png", mime: "image/png" };
  }
  if (buf.length >= 6) {
    const signature = buf.subarray(0, 6).toString("ascii");
    if (signature === "GIF87a" || signature === "GIF89a") {
      return { ext: ".gif", mime: "image/gif" };
    }
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: ".webp", mime: "image/webp" };
  }
  return null;
}

export function savePhoto(id: string, buf: Buffer) {
  if (buf.length === 0) throw new DeckError(400, "That photo file is empty.");
  if (buf.length > MAX_PHOTO_BYTES) throw new DeckError(400, "That photo is larger than 8 MB.");
  const sniffed = sniffImage(buf);
  if (!sniffed) throw new DeckError(400, "Use a JPEG, PNG, WebP, or GIF.");
  const db = getDb();
  const row = db.prepare("SELECT photo_file FROM contacts WHERE id = ?").get(id) as
    | { photo_file: string | null }
    | undefined;
  if (!row) throw new DeckError(404, "That card is no longer in the deck.");
  const filename = `${id}${sniffed.ext}`;
  fs.mkdirSync(photosDir(), { recursive: true });
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ photosDir(), filename), buf);
  if (row.photo_file && row.photo_file !== filename) removePhotoFile(row.photo_file);
  db.prepare("UPDATE contacts SET photo_file = ?, updated_at = ? WHERE id = ?").run(
    filename,
    new Date().toISOString(),
    id,
  );
  const contact = getContact(id);
  if (!contact) throw new DeckError(500, "The photo was saved but the card could not be read back.");
  return contact;
}

export function clearPhoto(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT photo_file FROM contacts WHERE id = ?").get(id) as
    | { photo_file: string | null }
    | undefined;
  if (!row) throw new DeckError(404, "That card is no longer in the deck.");
  removePhotoFile(row.photo_file);
  db.prepare("UPDATE contacts SET photo_file = NULL, updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    id,
  );
  const contact = getContact(id);
  if (!contact) throw new DeckError(500, "The photo was removed but the card could not be read back.");
  return contact;
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function readPhoto(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = getDb().prepare("SELECT photo_file FROM contacts WHERE id = ?").get(id) as
    | { photo_file: string | null }
    | undefined;
  if (!row?.photo_file || !safePhotoName(row.photo_file)) return null;
  const full = path.resolve(/*turbopackIgnore: true*/ photosDir(), row.photo_file);
  const root = path.resolve(/*turbopackIgnore: true*/ photosDir());
  if (!full.startsWith(`${root}${path.sep}`)) return null;
  if (!fs.existsSync(full)) return null;
  const mime = MIME_BY_EXT[path.extname(row.photo_file).toLowerCase()];
  if (!mime) return null;
  return { data: fs.readFileSync(full), mime };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ExportContact = {
  id: string;
  name: string;
  who: string;
  organization: string;
  city: string;
  notes: string;
  photoFile: string | null;
  introducedById: string | null;
  followUpOn: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  points: PointInput[];
  meetings: MeetingInput[];
};

export type ExportDocument = {
  format: "condex-v1";
  exportedAt: string;
  contacts: ExportContact[];
};

function timestamp(value: unknown) {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  return new Date().toISOString();
}

export function exportDocument(): { document: ExportDocument; photos: { name: string; file: string }[] } {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, who, organization, city, notes, photo_file, introduced_by_id,
              follow_up_on, created_at, updated_at
       FROM contacts
       ORDER BY name COLLATE NOCASE`,
    )
    .all() as {
    id: string;
    name: string;
    who: string;
    organization: string;
    city: string;
    notes: string;
    photo_file: string | null;
    introduced_by_id: string | null;
    follow_up_on: string | null;
    created_at: string;
    updated_at: string;
  }[];

  const contacts: ExportContact[] = rows.map((row) => {
    const contact = getContact(row.id);
    return {
      id: row.id,
      name: row.name,
      who: row.who,
      organization: row.organization,
      city: row.city,
      notes: row.notes,
      photoFile: row.photo_file && safePhotoName(row.photo_file) ? row.photo_file : null,
      introducedById: row.introduced_by_id,
      followUpOn: row.follow_up_on,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: contact?.tags ?? [],
      points: (contact?.points ?? []).map(({ kind, value, label }) => ({ kind, value, label })),
      meetings: (contact?.meetings ?? []).map(({ metOn, place, what }) => ({ metOn, place, what })),
    };
  });

  const photos = contacts
    .filter((contact) => contact.photoFile)
    .map((contact) => ({
      name: contact.photoFile as string,
      file: path.join(/*turbopackIgnore: true*/ photosDir(), contact.photoFile as string),
    }))
    .filter((photo) => fs.existsSync(photo.file));

  return {
    document: {
      format: "condex-v1",
      exportedAt: new Date().toISOString(),
      contacts,
    },
    photos,
  };
}

export function importDocument(raw: unknown, photoFiles: Map<string, Buffer>) {
  if (!raw || typeof raw !== "object") {
    throw new DeckError(400, "That file is not a ConDex export.");
  }
  const document = raw as Partial<ExportDocument>;
  if (document.format !== "condex-v1" || !Array.isArray(document.contacts)) {
    throw new DeckError(400, "That file is not a ConDex export.");
  }
  if (document.contacts.length > 20000) {
    throw new DeckError(400, "That export has more cards than ConDex will take.");
  }

  const prepared = document.contacts.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new DeckError(400, `Card ${index + 1} in the export is empty.`);
    }
    const record = item as Partial<ExportContact>;
    if (typeof record.id !== "string" || !UUID_RE.test(record.id)) {
      throw new DeckError(400, `Card ${index + 1} has a bad id.`);
    }
    const name = cleanText(record.name, 200, `Card ${index + 1} name`);
    if (!name) throw new DeckError(400, `Card ${index + 1} is missing a name.`);
    let photoFile: string | null = null;
    if (record.photoFile != null && record.photoFile !== "") {
      if (typeof record.photoFile !== "string" || !safePhotoName(record.photoFile)) {
        throw new DeckError(400, `Card ${index + 1} has a bad photo name.`);
      }
      if (!record.photoFile.toLowerCase().startsWith(record.id.toLowerCase())) {
        throw new DeckError(400, `Card ${index + 1} points at someone else’s photo.`);
      }
      if (!photoFiles.has(record.photoFile)) photoFile = null;
      else photoFile = record.photoFile;
    }
    return {
      id: record.id,
      name,
      who: cleanText(record.who, 500, "Who they are"),
      organization: cleanText(record.organization, 200, "Organization"),
      city: cleanText(record.city, 120, "City"),
      notes: cleanText(record.notes, 20000, "Notes"),
      photoFile,
      introducedById:
        record.introducedById == null || record.introducedById === ""
          ? null
          : String(record.introducedById),
      followUpOn: optionalDate(record.followUpOn, "The follow-up date"),
      createdAt: timestamp(record.createdAt),
      updatedAt: timestamp(record.updatedAt),
      tags: normalizeTags(record.tags),
      points: normalizePoints(record.points),
      meetings: normalizeMeetings(record.meetings),
    };
  });

  const ids = new Set<string>();
  for (const contact of prepared) {
    if (ids.has(contact.id)) throw new DeckError(400, "The export repeats a card id.");
    ids.add(contact.id);
  }
  for (const contact of prepared) {
    if (contact.introducedById && !ids.has(contact.introducedById)) {
      throw new DeckError(400, `${contact.name} was introduced by someone missing from the file.`);
    }
    if (contact.introducedById === contact.id) {
      throw new DeckError(400, "A person cannot introduce themselves.");
    }
  }

  const allowedPhotos = new Set(
    prepared.map((contact) => contact.photoFile).filter((name): name is string => Boolean(name)),
  );
  for (const name of photoFiles.keys()) {
    if (!allowedPhotos.has(name)) photoFiles.delete(name);
  }

  const staging = path.join(/*turbopackIgnore: true*/ dataDir(), "photos-staging");
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  for (const [name, buf] of photoFiles) {
    const sniffed = sniffImage(buf);
    if (!sniffed) throw new DeckError(400, `The photo ${name} is not a JPEG, PNG, WebP, or GIF.`);
    if (buf.length > MAX_PHOTO_BYTES) throw new DeckError(400, `The photo ${name} is larger than 8 MB.`);
    fs.writeFileSync(path.join(/*turbopackIgnore: true*/ staging, name), buf);
  }

  const db = getDb();
  try {
    db.transaction(() => {
      db.prepare("DELETE FROM contacts_fts").run();
      db.prepare("DELETE FROM contacts").run();
      db.prepare("DELETE FROM tags").run();
      const insert = db.prepare(
        `INSERT INTO contacts
          (id, name, who, organization, city, notes, photo_file, introduced_by_id, follow_up_on, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      );
      for (const contact of prepared) {
        insert.run(
          contact.id,
          contact.name,
          contact.who,
          contact.organization,
          contact.city,
          contact.notes,
          contact.photoFile,
          contact.followUpOn,
          contact.createdAt,
          contact.updatedAt,
        );
      }
      const linkIntroducer = db.prepare(
        "UPDATE contacts SET introduced_by_id = ? WHERE id = ?",
      );
      for (const contact of prepared) {
        if (contact.introducedById) linkIntroducer.run(contact.introducedById, contact.id);
      }
      for (const contact of prepared) {
        setTags(contact.id, contact.tags);
        const insertPoint = db.prepare(
          "INSERT INTO contact_points (id, contact_id, kind, value, label, position) VALUES (?, ?, ?, ?, ?, ?)",
        );
        contact.points.forEach((point, index) => {
          insertPoint.run(crypto.randomUUID(), contact.id, point.kind, point.value, point.label, index);
        });
        const insertMeeting = db.prepare(
          "INSERT INTO meetings (id, contact_id, met_on, place, what, position) VALUES (?, ?, ?, ?, ?, ?)",
        );
        contact.meetings.forEach((meeting, index) => {
          insertMeeting.run(
            crypto.randomUUID(),
            contact.id,
            meeting.metOn,
            meeting.place,
            meeting.what,
            index,
          );
        });
        indexContact(contact.id);
      }
    })();
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw error;
  }

  const previous = path.join(/*turbopackIgnore: true*/ dataDir(), "photos-previous");
  const live = photosDir();
  fs.rmSync(previous, { recursive: true, force: true });
  if (fs.existsSync(live)) fs.renameSync(live, previous);
  fs.renameSync(staging, live);
  fs.rmSync(previous, { recursive: true, force: true });

  return { contacts: prepared.length };
}
