export const MAX_WEB_SEARCH_QUERIES = 3;
export const MAX_WEB_SEARCH_QUERY_LENGTH = 200;

export type WebSearchStatus = "planning" | "searching" | "complete" | "error";

export type WebSearchSource = {
  sourceId: string;
  url: string;
  title?: string;
  /** Short excerpt from the page for preview cards. */
  excerpt?: string;
};

export type WebSearchProgress = {
  query: string;
  status: WebSearchStatus;
  error?: string;
  sources?: WebSearchSource[];
};

export function normalizeWebSearchQueries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const uniqueQueries = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;

    const query = item.replace(/\s+/g, " ").trim().slice(0, MAX_WEB_SEARCH_QUERY_LENGTH);
    if (query) uniqueQueries.add(query);
    if (uniqueQueries.size === MAX_WEB_SEARCH_QUERIES) break;
  }

  return [...uniqueQueries];
}
