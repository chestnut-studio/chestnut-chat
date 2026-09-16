import { describe, expect, it } from "vitest";

import { getBuiltinProviderDef, getOpenCodeGoProtocol } from "./models";

describe("OpenCode Go provider", () => {
  it("uses the official API base URL for model discovery", () => {
    expect(getBuiltinProviderDef("opencode-go")).toMatchObject({
      defaultBaseUrl: "https://opencode.ai/zen/go/v1",
      fetchMode: "openai",
    });
  });

  it.each([
    ["grok-4.6", "openai-responses"],
    ["gpt-5.6-luna", "openai-responses"],
    ["muse-spark-1.3-contributor", "openai-responses"],
    ["minimax-m3", "anthropic"],
    ["qwen3.8-flash", "anthropic"],
    ["union-alpha", "anthropic"],
    ["kimi-k3", "openai-compatible"],
    ["qwen3.8-max", "openai-compatible"],
    ["deepseek-v4-flash-vision-exp", "openai-compatible"],
  ] as const)("routes %s through %s", (modelId, protocol) => {
    expect(getOpenCodeGoProtocol(modelId)).toBe(protocol);
  });
});
