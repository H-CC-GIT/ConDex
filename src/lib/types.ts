export const POINT_KINDS = ["email", "phone", "url", "other"] as const;

export type PointKind = (typeof POINT_KINDS)[number];

export type ContactPoint = {
  id: string;
  kind: PointKind;
  value: string;
  label: string;
};

export type Meeting = {
  id: string;
  metOn: string;
  place: string;
  what: string;
};

export type Contact = {
  id: string;
  name: string;
  who: string;
  organization: string;
  city: string;
  notes: string;
  photoUrl: string | null;
  introducedById: string | null;
  introducedByName: string | null;
  followUpOn: string | null;
  tags: string[];
  points: ContactPoint[];
  meetings: Meeting[];
  createdAt: string;
  updatedAt: string;
};

export type DirectoryEntry = {
  id: string;
  name: string;
};

export type DueEntry = {
  id: string;
  name: string;
  followUpOn: string;
};

export type Deck = {
  today: string;
  contacts: Contact[];
  directory: DirectoryEntry[];
  due: DueEntry[];
};

export type RelatedCard = {
  reason: string;
  contact: Contact;
};

export type CardPage = {
  today: string;
  contact: Contact;
  related: RelatedCard[];
  directory: DirectoryEntry[];
};

export type PointInput = {
  kind: PointKind;
  value: string;
  label: string;
};

export type MeetingInput = {
  metOn: string;
  place: string;
  what: string;
};

export type ContactInput = {
  name: string;
  who?: string;
  organization?: string;
  city?: string;
  notes?: string;
  introducedById?: string | null;
  followUpOn?: string | null;
  tags?: string[];
  points?: PointInput[];
  meetings?: MeetingInput[];
};
