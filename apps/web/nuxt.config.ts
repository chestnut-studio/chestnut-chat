import "@chestnut-chat/env/web";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  experimental: {
    payloadExtraction: "client",
  },
  modules: ["@nuxt/ui", "@nuxtjs/i18n", "@nuxt/image"],
  app: {
    head: {
      link: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
      ],
    },
  },
  css: ["~/assets/css/main.css"],
  devServer: {
    port: 3011,
  },
  i18n: {
    strategy: "no_prefix",
    defaultLocale: "en",
    langDir: "locales",
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "zh", name: "简体中文", file: "zh.json" },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_locale",
      redirectOn: "root",
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        "@tanstack/vue-query",
        "@tanstack/vue-query-devtools",
        "@vue/devtools-api",
        "@ai-sdk/vue",
        "ai",
        "markstream-vue",
        "@orpc/client",
        "@orpc/client/fetch",
        "@orpc/tanstack-query",
        "better-auth/vue",
        "better-auth/client/plugins",
      ],
    },
  },
  runtimeConfig: {
    // server-side override for SSR fetches (NUXT_SERVER_URL); falls back to the public URL
    serverUrl: "",
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL ?? "",
    },
  },
});
