import type { WebSearchSource } from "@chestnut-chat/api/chat/web-search";
import type { InjectionKey } from "vue";

export const chatWebSearchSourcesKey: InjectionKey<() => readonly WebSearchSource[]> =
  Symbol("chat-web-search-sources");

const SOURCE_NAMES: Record<string, string> = {
  "apnews.com": "AP News",
  "bbc.com": "BBC",
  "bbc.co.uk": "BBC",
  "espn.com": "ESPN",
  "mirror.co.uk": "Mirror",
  "nytimes.com": "The New York Times",
  "reuters.com": "Reuters",
  "skysports.com": "Sky Sports",
  "theguardian.com": "The Guardian",
  "wikipedia.org": "Wikipedia",
};

function sourceHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function conciseLinkLabel(value?: string) {
  const label = value?.replace(/\s+/gu, " ").trim();
  if (!label) return null;

  const publisherPrefix = /^(.{2,32}?)(?:\s*[:：|·—–]\s+)/u.exec(label)?.[1]?.trim();
  if (publisherPrefix) return publisherPrefix;

  if (label.length <= 28 && label.split(/\s+/u).length <= 4) return label;
  return null;
}

export function normalizeSourceUrl(url: string) {
  try {
    const normalized = new URL(url);
    normalized.hash = "";
    if (normalized.pathname !== "/") {
      normalized.pathname = normalized.pathname.replace(/\/+$/, "");
    }
    return normalized.toString();
  } catch {
    return url.trim();
  }
}

export function sourceSiteLabel(source: WebSearchSource, linkLabel?: string) {
  const conciseLabel = conciseLinkLabel(linkLabel);
  if (conciseLabel) return conciseLabel;

  const hostname = sourceHostname(source.url);
  const brandedHostname = Object.keys(SOURCE_NAMES).find(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );

  return (
    (brandedHostname && SOURCE_NAMES[brandedHostname]) || hostname || source.title || source.url
  );
}

export function sourceTitle(source: WebSearchSource) {
  return source.title?.trim() || sourceSiteLabel(source) || source.url;
}

export function sourceFaviconUrl(url: string) {
  try {
    return new URL("/favicon.ico", url).toString();
  } catch {
    return undefined;
  }
}

export function mergeWebSearchSources(
  preferred: readonly WebSearchSource[],
  fallback: readonly WebSearchSource[],
) {
  if (preferred.length) return [...preferred];

  const byUrl = new Map<string, WebSearchSource>();
  for (const source of fallback) {
    const key = normalizeSourceUrl(source.url);
    if (!byUrl.has(key)) byUrl.set(key, source);
  }
  return [...byUrl.values()];
}
