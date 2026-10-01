import fs from "fs";
import JSZip from "jszip";
import { DeckError, exportDocument, importDocument, sniffImage } from "./contacts";

const PHOTO_ENTRY = /^photos\/([0-9a-f-]{36}\.(?:jpg|png|webp|gif))$/i;
const MAX_ZIP_BYTES = 32 * 1024 * 1024;

function declaredUncompressedSize(file: JSZip.JSZipObject) {
  const stored = file as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } };
  const size = stored._data?.uncompressedSize;
  return typeof size === "number" && Number.isFinite(size) ? size : null;
}

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
  if (buf.length > MAX_ZIP_BYTES) throw new DeckError(400, "That zip is larger than 32 MB.");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new DeckError(400, "That file is not a zip of ConDex cards.");
  }
  const entry = zip.file("condex.json");
  if (!entry) throw new DeckError(400, "The export is missing condex.json.");

  let unpacked = 0;
  const take = (bytes: number) => {
    unpacked += bytes;
    if (unpacked > MAX_ZIP_BYTES) {
      throw new DeckError(400, "That zip unpacks to more than 32 MB.");
    }
  };
  const jsonSize = declaredUncompressedSize(entry);
  if (jsonSize != null) take(jsonSize);

  let parsed: unknown;
  let jsonText: string;
  try {
    jsonText = await entry.async("string");
    parsed = JSON.parse(jsonText);
  } catch (error) {
    if (error instanceof DeckError) throw error;
    throw new DeckError(400, "condex.json could not be read.");
  }
  const jsonBytes = Buffer.byteLength(jsonText);
  if (jsonSize == null) take(jsonBytes);
  else if (jsonBytes > jsonSize) take(jsonBytes - jsonSize);

  const photos = new Map<string, Buffer>();
  const files = zip.filter((name) => PHOTO_ENTRY.test(name));
  if (files.length > MAX_ZIP_BYTES) {
    throw new DeckError(400, "That zip has too many photos.");
  }
  for (const file of files) {
    const match = PHOTO_ENTRY.exec(file.name);
    if (!match) continue;
    const claimed = declaredUncompressedSize(file);
    if (claimed != null) take(claimed);
    const data = Buffer.from(await file.async("uint8array"));
    if (claimed == null) take(data.length);
    else if (data.length > claimed) take(data.length - claimed);
    if (!sniffImage(data)) {
      throw new DeckError(400, `${match[1]} is not a JPEG, PNG, WebP, or GIF.`);
    }
    photos.set(match[1], data);
  }

  return importDocument(parsed, photos);
}
