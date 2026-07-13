export type WebSearchStatus = "searching" | "complete" | "error";

export type WebSearchProgress = {
  query: string;
  status: WebSearchStatus;
  error?: string;
};

export type WebSearchSource = {
  sourceId: string;
  url: string;
  title?: string;
};
