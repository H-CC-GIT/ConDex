import fs from "fs";
import JSZip from "jszip";
import { DeckError, exportDocument, importDocument, sniffImage } from "./contacts";

const PHOTO_ENTRY = /^photos\/([0-9a-f-]{36}\.(?:jpg|png|webp|gif))$/i;
const MAX_ZIP_BYTES = 80 * 1024 * 1024;

export async function buildZip() {
  const { document, photos } = exportDocument();
  const zip = new JSZip();
  zip.file("condex.json", JSON.stringify(document, null, 2));
  const folder = zip.folder("photos");
  for (const photo of photos) {
    folder?.file(photo.name, fs.readFileSync(photo.file));
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function readZip(buf: Buffer) {
  if (buf.length === 0) throw new DeckError(400, "That zip file is empty.");
  if (buf.length > MAX_ZIP_BYTES) throw new DeckError(400, "That zip is larger than 80 MB.");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new DeckError(400, "That file is not a zip of ConDex cards.");
  }
  const entry = zip.file("condex.json");
  if (!entry) throw new DeckError(400, "The export is missing condex.json.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(await entry.async("string"));
  } catch {
    throw new DeckError(400, "condex.json could not be read.");
  }

  const photos = new Map<string, Buffer>();
  const files = zip.filter((name) => PHOTO_ENTRY.test(name));
  for (const file of files) {
    const match = PHOTO_ENTRY.exec(file.name);
    if (!match) continue;
    const data = Buffer.from(await file.async("uint8array"));
    if (!sniffImage(data)) {
      throw new DeckError(400, `${match[1]} is not a JPEG, PNG, WebP, or GIF.`);
    }
    photos.set(match[1], data);
  }

  return importDocument(parsed, photos);
}
