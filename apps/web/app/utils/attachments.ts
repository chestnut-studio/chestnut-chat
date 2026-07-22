import type { DocumentAttachment, ProcessedAttachment } from "@chestnut-chat/api/chat/attachments";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_REQUEST,
} from "@chestnut-chat/api/chat/attachments";
import type { FileUIPart } from "ai";

export type ChatAttachmentParts = {
  files: FileUIPart[];
  documents: DocumentAttachment[];
};

export type ChatBoxAttachmentPayload = ChatAttachmentParts;

export { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_REQUEST };

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const DOCUMENT_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt", ".md", ".markdown"]);

function extensionOf(filename: string) {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

export function isImageFile(file: File) {
  if (file.type.toLowerCase().startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.has(extensionOf(file.name));
}

export function isDocumentFile(file: File) {
  const type = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (
    type === "application/pdf" ||
    type === "application/msword" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "text/plain" ||
    type === "text/markdown" ||
    type === "text/x-markdown"
  ) {
    return true;
  }
  return DOCUMENT_EXTENSIONS.has(extensionOf(file.name));
}

export function isSupportedAttachment(file: File) {
  return isImageFile(file) || isDocumentFile(file);
}

export function validateAttachmentSelection(
  files: File[],
  options: { supportsVision: boolean },
): string | null {
  if (files.length > MAX_ATTACHMENTS_PER_REQUEST) {
    return "tooMany";
  }

  for (const file of files) {
    if (!isSupportedAttachment(file)) return "unsupportedType";
    if (file.size <= 0) return "empty";
    if (file.size > MAX_ATTACHMENT_BYTES) return "tooLarge";
    if (isImageFile(file) && !options.supportsVision) return "visionRequired";
  }

  return null;
}

export function attachmentPartsFromProcessed(
  attachments: ProcessedAttachment[],
): ChatAttachmentParts {
  const files: FileUIPart[] = [];
  const documents: DocumentAttachment[] = [];

  for (const attachment of attachments) {
    if (attachment.kind === "image") {
      files.push({
        type: "file",
        filename: attachment.filename,
        mediaType: attachment.mediaType,
        url: attachment.url,
      });
      continue;
    }

    documents.push({
      filename: attachment.filename,
      mediaType: attachment.mediaType,
      extractedText: attachment.extractedText,
    });
  }

  return { files, documents };
}

export async function uploadAttachments(
  serverUrl: string,
  files: File[],
): Promise<ProcessedAttachment[]> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const response = await fetch(`${serverUrl}/ai/attachments`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as {
    attachments?: ProcessedAttachment[];
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error || `Upload failed (${response.status})`);
  }

  return payload?.attachments ?? [];
}

export const DEFAULT_ATTACHMENT_PROMPT = "Please review the attached files.";

const SESSION_STORAGE_ATTACHMENT_BUDGET = 1_500_000;

export function attachmentPayloadFitsSessionStorage(parts: ChatAttachmentParts) {
  try {
    return JSON.stringify(parts).length <= SESSION_STORAGE_ATTACHMENT_BUDGET;
  } catch {
    return false;
  }
}
