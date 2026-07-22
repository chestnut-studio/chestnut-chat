export type ChatSuggestionId = "write" | "code" | "explain" | "plan";

const CODE_SNIPPET = `function groupBy(items, key) {
  const result = {}
  for (const item of items) {
    const k = String(item[key])
    result[k] = result[k] || []
    result[k].push(item)
  }
  return result
}`;

const PROMPTS = {
  en: {
    write:
      "Help me write a concise, friendly email asking a teammate for feedback on a project proposal. Keep it under 120 words and leave a short placeholder for the project name.",
    code: `Review this JavaScript function for bugs and readability, then suggest a cleaner version with brief comments explaining the changes:\n\n${CODE_SNIPPET}`,
    explain:
      "Explain how large language models generate text, as if I'm a curious beginner. Use a simple analogy, avoid jargon where possible, and end with one practical tip for writing better prompts.",
    plan: "I want to ship a personal portfolio website in two weekends. Propose a realistic plan with milestones, a focused tech stack, and a day-by-day checklist. Keep it practical and lightweight.",
  },
  zh: {
    write:
      "帮我写一封简洁友好的邮件，向同事征求项目方案的反馈。控制在 120 字以内，并为项目名称留一个简短占位符。",
    code: `请审查下面这段 JavaScript 函数的潜在问题和可读性，然后给出更清晰的改写，并用简短注释说明改动：\n\n${CODE_SNIPPET}`,
    explain:
      "请用初学者能听懂的方式解释大语言模型如何生成文本。多用简单类比，少用术语，最后再给一条写好提示词的实用建议。",
    plan: "我想用两个周末上线一个个人作品集网站。请给出切实可行的计划：关键里程碑、精简技术栈，以及按天的任务清单。尽量轻量、好执行。",
  },
} as const satisfies Record<string, Record<ChatSuggestionId, string>>;

export function getChatSuggestionPrompt(locale: string, id: ChatSuggestionId) {
  const normalized = locale.toLowerCase().startsWith("zh") ? "zh" : "en";
  return PROMPTS[normalized][id];
}
