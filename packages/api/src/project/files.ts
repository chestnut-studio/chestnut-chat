import { DOCUMENT_MEDIA_TYPES, MAX_ATTACHMENT_BYTES } from "../chat/attachments";

export const MAX_PROJECT_FILES = 10;
export const MAX_PROJECT_FILE_BYTES = MAX_ATTACHMENT_BYTES;
export const PROJECT_FILE_MEDIA_TYPES = DOCUMENT_MEDIA_TYPES;
export const PROJECT_FILE_ACCEPT = ".pdf,.doc,.docx,.txt,.md";

const DOCUMENT_TYPE_SET = new Set<string>(PROJECT_FILE_MEDIA_TYPES);

export function isProjectDocumentFile(filename: string, mediaType: string) {
  const normalizedType = mediaType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (DOCUMENT_TYPE_SET.has(normalizedType)) return true;

  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return (
    extension === ".pdf" ||
    extension === ".doc" ||
    extension === ".docx" ||
    extension === ".txt" ||
    extension === ".md" ||
    extension === ".markdown"
  );
}

export type ProjectFileValidationError =
  | "tooMany"
  | "tooLarge"
  | "empty"
  | "unsupportedType"
  | "imageRejected";

export function validateProjectFileSelection(
  files: Array<{ name: string; type: string; size: number }>,
  existingCount = 0,
): ProjectFileValidationError | null {
  if (existingCount + files.length > MAX_PROJECT_FILES) return "tooMany";

  for (const file of files) {
    if (file.size <= 0) return "empty";
    if (file.size > MAX_PROJECT_FILE_BYTES) return "tooLarge";

    const mediaType = file.type || "application/octet-stream";
    const isImage =
      mediaType.toLowerCase().startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    if (isImage) return "imageRejected";
    if (!isProjectDocumentFile(file.name, mediaType)) return "unsupportedType";
  }

  return null;
}
