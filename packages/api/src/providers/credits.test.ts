import { describe, expect, it, vi } from "vitest";

import { fetchProviderCredits } from "./credits";

describe("fetchProviderCredits", () => {
  it("parses OpenRouter credits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: { total_credits: 10, total_usage: 3.5 } }),
      })),
    );

    const result = await fetchProviderCredits({
      apiKey: "sk-test",
      providerId: "openrouter",
    });

    expect(result).toEqual({
      supported: true,
      kind: "currency",
      amount: 6.5,
      currency: "USD",
      label: "remaining",
    });
  });

  it("parses DeepSeek balance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          is_available: true,
          balance_infos: [{ currency: "CNY", total_balance: "8.66" }],
        }),
      })),
    );

    const result = await fetchProviderCredits({
      apiKey: "sk-test",
      providerId: "deepseek",
    });

    expect(result).toEqual({
      supported: true,
      kind: "currency",
      amount: 8.66,
      currency: "CNY",
      label: "balance",
    });
  });

  it("returns unsupported for providers without balance APIs", async () => {
    const result = await fetchProviderCredits({
      apiKey: "sk-test",
      providerId: "qwen",
    });

    expect(result).toEqual({ supported: false });
  });
});
