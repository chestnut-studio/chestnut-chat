import "@chestnut-chat/env/web";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";

const emptyModule = fileURLToPath(new URL("./server/stubs/empty-module.ts", import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  experimental: {
    payloadExtraction: "client",
  },
  modules: [
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "vue-sonner/nuxt",
    "@nuxtjs/i18n",
    "@nuxt/image",
  ],
  fonts: {
    families: [
      { name: "Inter", provider: "google", weights: [400, 500, 600, 700] },
      { name: "JetBrains Mono", provider: "google", weights: [400, 500] },
    ],
  },
  icon: {
    localApiEndpoint: "/_nuxt_icon",
    clientBundle: {
      icons: ["ri:github-fill", "ri:google-fill"],
    },
  },
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
  colorMode: {
    classSuffix: "",
  },
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
    plugins: [tailwindcss()],
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
        "@vue/devtools-api",
        "better-auth/client/plugins",
        "better-auth/vue",
        "markdown-it-emoji",
        "markstream-vue",
      ],
    },
  },
  nitro: {
    alias: {
      // markstream-vue imports this without an extension, which Rollup cannot resolve when
      // Nitro bundles dependencies (Cloudflare preset). Use the package's exports entry.
      "katex/dist/contrib/mhchem": "katex/contrib/mhchem",
      // Optional markstream-vue peers load via guarded dynamic imports; Cloudflare bundles forbid
      // unresolved externals, so point the uninstalled ones at an empty module.
      ...Object.fromEntries(
        ["@terrastruct/d2", "stream-monaco"].map((name) => [name, emptyModule]),
      ),
    },
  },
  runtimeConfig: {
    // server-side override for SSR fetches (NUXT_SERVER_URL); falls back to the public URL.
    // Browser API calls go through apps/web/server/middleware/api-proxy.ts
    // when NUXT_SERVER_URL is set (orb portals require same-origin).
    serverUrl: "",
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL ?? "",
    },
  },
});
