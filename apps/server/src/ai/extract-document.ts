import {
  MAX_EXTRACTED_TEXT_CHARS,
  type DocumentAttachment,
} from "@chestnut-chat/api/chat/attachments";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import WordExtractor from "word-extractor";

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".markdown"]);
const PDF_EXTENSIONS = new Set([".pdf"]);
const DOCX_EXTENSIONS = new Set([".docx"]);
const DOC_EXTENSIONS = new Set([".doc"]);

function extensionOf(filename: string) {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

function truncateExtractedText(text: string) {
  const normalized = text.replace(/\u0000/g, "").trim();
  if (normalized.length <= MAX_EXTRACTED_TEXT_CHARS) return normalized;

  return `${normalized.slice(0, MAX_EXTRACTED_TEXT_CHARS).trimEnd()}\n\n[Content truncated]`;
}

function resolveKind(filename: string, mediaType: string) {
  const extension = extensionOf(filename);
  const normalizedType = mediaType.toLowerCase().split(";")[0]?.trim() ?? "";

  if (
    PDF_EXTENSIONS.has(extension) ||
    normalizedType === "application/pdf" ||
    normalizedType === "application/x-pdf"
  ) {
    return "pdf" as const;
  }

  if (
    DOCX_EXTENSIONS.has(extension) ||
    normalizedType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx" as const;
  }

  if (DOC_EXTENSIONS.has(extension) || normalizedType === "application/msword") {
    return "doc" as const;
  }

  if (
    TEXT_EXTENSIONS.has(extension) ||
    normalizedType === "text/plain" ||
    normalizedType === "text/markdown" ||
    normalizedType === "text/x-markdown"
  ) {
    return "text" as const;
  }

  return null;
}

async function extractPdf(buffer: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : String(text ?? "");
}

async function extractDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractDoc(buffer: Buffer) {
  const extractor = new WordExtractor();
  const document = await extractor.extract(buffer);
  return document.getBody();
}

async function extractPlainText(buffer: Buffer) {
  return buffer.toString("utf8");
}

export async function extractDocumentText(
  filename: string,
  mediaType: string,
  buffer: Buffer,
): Promise<DocumentAttachment> {
  const kind = resolveKind(filename, mediaType);
  if (!kind) {
    throw new Error(`Unsupported document type: ${filename}`);
  }

  let rawText: string;
  switch (kind) {
    case "pdf":
      rawText = await extractPdf(buffer);
      break;
    case "docx":
      rawText = await extractDocx(buffer);
      break;
    case "doc":
      rawText = await extractDoc(buffer);
      break;
    case "text":
      rawText = await extractPlainText(buffer);
      break;
  }

  const extractedText = truncateExtractedText(rawText);
  if (!extractedText) {
    throw new Error(`No readable text found in ${filename}`);
  }

  return {
    filename,
    mediaType: mediaType || "application/octet-stream",
    extractedText,
  };
}

export function isDocumentAttachment(filename: string, mediaType: string) {
  return resolveKind(filename, mediaType) !== null;
}
