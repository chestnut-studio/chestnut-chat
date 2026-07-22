export type WebSearchStatus = "searching" | "complete" | "error";

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
