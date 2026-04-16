import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { logger } from "@/lib/logger";

type PersistInput = {
  image: string;
  slugHint?: string;
};

const STORAGE_DRIVER = (process.env.IMAGE_STORAGE_DRIVER ?? "local").toLowerCase();
const LOCALIZE_REMOTE = process.env.IMAGE_LOCALIZE_REMOTE === "true";
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "blog-covers");

const safeSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);

const extensionFromMime = (mime: string): string => {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "jpg";
};

const extensionFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".png")) return "png";
    if (pathname.endsWith(".webp")) return "webp";
    if (pathname.endsWith(".gif")) return "gif";
    if (pathname.endsWith(".jpeg") || pathname.endsWith(".jpg")) return "jpg";
  } catch {
    // ignore
  }
  return "jpg";
};

const decodeDataUrl = (value: string): { buffer: Buffer; extension: string } | null => {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const payload = match[2];
  try {
    return {
      buffer: Buffer.from(payload, "base64"),
      extension: extensionFromMime(mime),
    };
  } catch {
    return null;
  }
};

const makeFilename = (base: string, extension: string, entropy: string): string => {
  const normalized = safeSlug(base) || "blog-cover";
  const hash = createHash("sha1").update(`${base}|${entropy}`).digest("hex").slice(0, 10);
  return `${normalized}-${hash}.${extension}`;
};

const writeLocalFile = async ({
  bytes,
  extension,
  slugHint,
  entropy,
}: {
  bytes: Buffer;
  extension: string;
  slugHint?: string;
  entropy: string;
}): Promise<string> => {
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const filename = makeFilename(slugHint || "blog-cover", extension, entropy);
  const absolute = path.join(LOCAL_UPLOAD_DIR, filename);
  await writeFile(absolute, bytes);
  return `/uploads/blog-covers/${filename}`;
};

const persistDataUrlLocally = async (dataUrl: string, slugHint?: string): Promise<string | null> => {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;
  if (decoded.buffer.byteLength > 10 * 1024 * 1024) {
    logger.warn({ bytes: decoded.buffer.byteLength }, "Image skipped: exceeds 10MB local upload cap");
    return null;
  }
  return writeLocalFile({
    bytes: decoded.buffer,
    extension: decoded.extension,
    slugHint,
    entropy: randomUUID(),
  });
};

const downloadRemoteImage = async (url: string): Promise<{ bytes: Buffer; extension: string } | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    if (bytes.byteLength === 0 || bytes.byteLength > 12 * 1024 * 1024) return null;
    const contentType = response.headers.get("content-type") ?? "";
    const extension = contentType.startsWith("image/")
      ? extensionFromMime(contentType)
      : extensionFromUrl(url);
    return { bytes, extension };
  } catch {
    return null;
  }
};

const persistRemoteUrlLocally = async (url: string, slugHint?: string): Promise<string | null> => {
  const downloaded = await downloadRemoteImage(url);
  if (!downloaded) return null;
  return writeLocalFile({
    bytes: downloaded.bytes,
    extension: downloaded.extension,
    slugHint,
    entropy: url,
  });
};

export const persistBlogCoverImage = async ({ image, slugHint }: PersistInput): Promise<string> => {
  const value = image.trim();
  if (!value) return value;

  if (STORAGE_DRIVER === "local") {
    if (value.startsWith("data:image/")) {
      const persisted = await persistDataUrlLocally(value, slugHint);
      return persisted ?? value;
    }
    if (/^https?:\/\//i.test(value) && LOCALIZE_REMOTE) {
      const localized = await persistRemoteUrlLocally(value, slugHint);
      return localized ?? value;
    }
    return value;
  }

  // Cloud driver hook (S3/Cloudinary) can be implemented here.
  // For now, we safely fall back to storing the original URL.
  logger.info({ driver: STORAGE_DRIVER }, "Cloud image storage driver not implemented; using source URL");
  return value;
};
