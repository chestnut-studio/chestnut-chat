import type { BuiltinProviderId } from "./models";
import { normalizeBaseUrl, normalizeProviderApiKey } from "./models";

export type ProviderCreditsKind = "tokens" | "currency" | "usage_percent";

export interface ProviderCredits {
  supported: boolean;
  kind?: ProviderCreditsKind;
  tokensRemaining?: number;
  tokensTotal?: number;
  amount?: number;
  currency?: string;
  usagePercent?: number;
  label?: string;
  error?: string;
}

export interface FetchProviderCreditsOptions {
  apiKey: string;
  baseUrl?: string | null;
  providerId?: BuiltinProviderId;
  isCustom?: boolean;
}

export class ProviderCreditsFetchError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProviderCreditsFetchError";
  }
}

const UNSUPPORTED: ProviderCredits = { supported: false };

function recordFrom(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function textFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

async function readJsonResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const record = recordFrom(payload);
    const error = recordFrom(record?.error);
    const message = textFrom(error?.message) ?? textFrom(record?.message) ?? response.statusText;
    throw new ProviderCreditsFetchError(response.status, message);
  }
  return payload;
}

async function fetchWithBearer(url: string, apiKey: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${normalizeProviderApiKey(apiKey)}`,
    },
  });
  return readJsonResponse(response);
}

function successCredits(credits: Omit<ProviderCredits, "supported">): ProviderCredits {
  return { supported: true, ...credits };
}

async function fetchOpenRouterCredits(apiKey: string): Promise<ProviderCredits> {
  const payload = recordFrom(await fetchWithBearer("https://openrouter.ai/api/v1/credits", apiKey));
  const data = recordFrom(payload?.data) ?? payload;
  const totalCredits = numberFrom(data?.total_credits);
  const totalUsage = numberFrom(data?.total_usage);

  if (totalCredits == null || totalUsage == null) {
    throw new ProviderCreditsFetchError(502, "Unexpected OpenRouter credits response");
  }

  return successCredits({
    kind: "currency",
    amount: Math.max(0, totalCredits - totalUsage),
    currency: "USD",
    label: "remaining",
  });
}

async function fetchDeepSeekCredits(
  apiKey: string,
  baseUrl?: string | null,
): Promise<ProviderCredits> {
  const root = normalizeBaseUrl(baseUrl?.trim() || "https://api.deepseek.com");
  const payload = recordFrom(await fetchWithBearer(`${root}/user/balance`, apiKey));
  const balanceInfos = Array.isArray(payload?.balance_infos) ? payload.balance_infos : [];
  const primary =
    balanceInfos.find((item) => recordFrom(item)?.currency?.toString().toUpperCase() === "USD") ??
    balanceInfos[0];
  const info = recordFrom(primary);
  const amount = numberFrom(info?.total_balance);

  if (amount == null) {
    throw new ProviderCreditsFetchError(502, "Unexpected DeepSeek balance response");
  }

  return successCredits({
    kind: "currency",
    amount,
    currency: textFrom(info?.currency)?.toUpperCase() ?? "CNY",
    label: "balance",
  });
}

async function fetchKimiCredits(apiKey: string, baseUrl?: string | null): Promise<ProviderCredits> {
  const root = normalizeBaseUrl(baseUrl?.trim() || "https://api.moonshot.cn/v1");
  const payload = recordFrom(await fetchWithBearer(`${root}/users/me/balance`, apiKey));
  const data = recordFrom(payload?.data) ?? payload;
  const amount =
    numberFrom(data?.available_balance) ??
    numberFrom(data?.cash_balance) ??
    numberFrom(payload?.available_balance);

  if (amount == null) {
    throw new ProviderCreditsFetchError(502, "Unexpected Kimi balance response");
  }

  return successCredits({
    kind: "currency",
    amount,
    currency: "CNY",
    label: "balance",
  });
}

async function fetchMiniMaxCredits(apiKey: string): Promise<ProviderCredits> {
  const endpoints = [
    "https://www.minimax.io/v1/token_plan/remains",
    "https://api.minimax.io/v1/token_plan/remains",
  ];

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const payload = recordFrom(await fetchWithBearer(endpoint, apiKey));
      const baseResp = recordFrom(payload?.base_resp);
      const statusCode = numberFrom(baseResp?.status_code);
      if (statusCode != null && statusCode !== 0) {
        throw new ProviderCreditsFetchError(
          502,
          textFrom(baseResp?.status_msg) ?? "MiniMax credits query failed",
        );
      }

      const remains = Array.isArray(payload?.model_remains) ? payload.model_remains : [];
      const primary = recordFrom(remains[0]);
      if (!primary) {
        throw new ProviderCreditsFetchError(502, "MiniMax token plan data unavailable");
      }

      const remainingPercent = numberFrom(primary.current_interval_remaining_percent);
      if (remainingPercent != null) {
        return successCredits({
          kind: "usage_percent",
          usagePercent: Math.max(0, Math.min(100, remainingPercent)),
          label: "5h_window",
        });
      }

      const total = numberFrom(primary.current_interval_total_count);
      const remaining = numberFrom(
        primary.current_interval_remaining_count ??
          primary.current_interval_remains_count ??
          primary.current_interval_usage_count,
      );

      if (remaining != null) {
        return successCredits({
          kind: "tokens",
          tokensRemaining: Math.max(0, Math.floor(remaining)),
          tokensTotal: total != null ? Math.max(0, Math.floor(total)) : undefined,
          label: "5h_window",
        });
      }

      throw new ProviderCreditsFetchError(502, "MiniMax token plan data unavailable");
    } catch (cause) {
      lastError = cause;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch MiniMax credits");
}

async function fetchCustomCredits(
  apiKey: string,
  baseUrl?: string | null,
): Promise<ProviderCredits> {
  if (!baseUrl?.trim()) return UNSUPPORTED;

  const root = normalizeBaseUrl(baseUrl);
  const candidates = [`${root}/user/balance`, `${root}/users/me/balance`, `${root}/credits`];

  for (const url of candidates) {
    try {
      const payload = recordFrom(await fetchWithBearer(url, apiKey));

      const openRouterData = recordFrom(payload?.data);
      const totalCredits = numberFrom(openRouterData?.total_credits);
      const totalUsage = numberFrom(openRouterData?.total_usage);
      if (totalCredits != null && totalUsage != null) {
        return successCredits({
          kind: "currency",
          amount: Math.max(0, totalCredits - totalUsage),
          currency: "USD",
          label: "remaining",
        });
      }

      const balanceInfos = Array.isArray(payload?.balance_infos) ? payload.balance_infos : [];
      const balanceInfo = recordFrom(balanceInfos[0]);
      const deepSeekAmount = numberFrom(balanceInfo?.total_balance);
      if (deepSeekAmount != null) {
        return successCredits({
          kind: "currency",
          amount: deepSeekAmount,
          currency: textFrom(balanceInfo?.currency)?.toUpperCase() ?? "CNY",
          label: "balance",
        });
      }

      const data = recordFrom(payload?.data) ?? payload;
      const kimiAmount = numberFrom(data?.available_balance) ?? numberFrom(data?.cash_balance);
      if (kimiAmount != null) {
        return successCredits({
          kind: "currency",
          amount: kimiAmount,
          currency: "CNY",
          label: "balance",
        });
      }
    } catch {
      // Try the next known balance endpoint shape.
    }
  }

  return UNSUPPORTED;
}

export async function fetchProviderCredits(
  options: FetchProviderCreditsOptions,
): Promise<ProviderCredits> {
  const { apiKey, baseUrl, providerId, isCustom } = options;

  if (isCustom) {
    return fetchCustomCredits(apiKey, baseUrl);
  }

  switch (providerId) {
    case "openrouter":
      return fetchOpenRouterCredits(apiKey);
    case "deepseek":
      return fetchDeepSeekCredits(apiKey, baseUrl);
    case "kimi":
      return fetchKimiCredits(apiKey, baseUrl);
    case "minimax":
      return fetchMiniMaxCredits(apiKey);
    default:
      return UNSUPPORTED;
  }
}
