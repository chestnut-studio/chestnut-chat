export type DocumentAttachment = {
  filename: string;
  mediaType: string;
  extractedText: string;
};

export type ProcessedAttachment =
  | {
      kind: "document";
      filename: string;
      mediaType: string;
      extractedText: string;
      size: number;
    }
  | {
      kind: "image";
      filename: string;
      mediaType: string;
      url: string;
      size: number;
    };

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_REQUEST = 5;
export const MAX_EXTRACTED_TEXT_CHARS = 100_000;
export const MAX_IMAGE_DATA_URL_CHARS = 4 * 1024 * 1024;

export const DOCUMENT_MEDIA_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export const IMAGE_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export const ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,.txt,.md,image/png,image/jpeg,image/webp,image/gif";
