import type { ProviderCredits } from "@chestnut-chat/api/providers/credits";

import { formatTokenCount } from "~/utils/format-tokens";

function formatCurrencyAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "USD" ? 2 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatProviderCredits(credits: ProviderCredits) {
  if (credits.kind === "currency" && credits.amount != null && credits.currency) {
    return formatCurrencyAmount(credits.amount, credits.currency);
  }

  if (credits.kind === "usage_percent" && credits.usagePercent != null) {
    return `${Math.round(credits.usagePercent)}%`;
  }

  if (credits.kind === "tokens" && credits.tokensRemaining != null) {
    const remaining = formatTokenCount(credits.tokensRemaining);
    if (credits.tokensTotal != null) {
      return `${remaining} / ${formatTokenCount(credits.tokensTotal)}`;
    }
    return remaining;
  }

  return null;
}
