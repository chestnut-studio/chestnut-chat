import { auth } from "@chestnut-chat/auth";
import {
  IMAGE_MEDIA_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_REQUEST,
  MAX_IMAGE_DATA_URL_CHARS,
  type ProcessedAttachment,
} from "@chestnut-chat/api/chat/attachments";
import type { Context } from "hono";

import { extractDocumentText, isDocumentAttachment } from "./extract-document";

const IMAGE_TYPE_SET = new Set<string>(IMAGE_MEDIA_TYPES);

function isImageAttachment(filename: string, mediaType: string) {
  const normalizedType = mediaType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (IMAGE_TYPE_SET.has(normalizedType)) return true;

  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return (
    extension === ".png" ||
    extension === ".jpg" ||
    extension === ".jpeg" ||
    extension === ".webp" ||
    extension === ".gif"
  );
}

function resolveImageMediaType(filename: string, mediaType: string) {
  const normalizedType = mediaType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (IMAGE_TYPE_SET.has(normalizedType)) return normalizedType;

  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

function toDataUrl(mediaType: string, buffer: Buffer) {
  const url = `data:${mediaType};base64,${buffer.toString("base64")}`;
  if (url.length > MAX_IMAGE_DATA_URL_CHARS) {
    throw new Error("Image is too large after encoding. Use a smaller image.");
  }
  return url;
}

async function processFile(file: File): Promise<ProcessedAttachment> {
  if (file.size <= 0) {
    throw new Error(`Empty file: ${file.name}`);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    const limitMb = Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024));
    throw new Error(`File exceeds ${limitMb} MB limit: ${file.name}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = file.type || "application/octet-stream";

  if (isDocumentAttachment(file.name, mediaType)) {
    const document = await extractDocumentText(file.name, mediaType, buffer);
    return {
      kind: "document",
      filename: document.filename,
      mediaType: document.mediaType,
      extractedText: document.extractedText,
      size: file.size,
    };
  }

  if (isImageAttachment(file.name, mediaType)) {
    const imageMediaType = resolveImageMediaType(file.name, mediaType);
    return {
      kind: "image",
      filename: file.name,
      mediaType: imageMediaType,
      url: toDataUrl(imageMediaType, buffer),
      size: file.size,
    };
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}

export async function handleAiAttachments(c: Context): Promise<Response> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid multipart form data" }, 400);
  }

  const files = form.getAll("files").flatMap((entry) => {
    if (typeof entry === "string") return [];
    if (typeof File !== "undefined" && entry instanceof File) return [entry];
    // Node FormData may return Blob-like values with a name.
    if (
      typeof entry === "object" &&
      entry !== null &&
      "arrayBuffer" in entry &&
      typeof (entry as Blob).arrayBuffer === "function" &&
      "name" in entry &&
      typeof (entry as { name?: unknown }).name === "string"
    ) {
      return [entry as File];
    }
    return [];
  });

  if (files.length === 0) {
    return c.json({ error: "At least one file is required" }, 400);
  }
  if (files.length > MAX_ATTACHMENTS_PER_REQUEST) {
    return c.json({ error: `At most ${MAX_ATTACHMENTS_PER_REQUEST} files are allowed` }, 400);
  }

  try {
    const attachments = await Promise.all(files.map((file) => processFile(file)));
    return c.json({ attachments });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to process attachments" },
      400,
    );
  }
}
