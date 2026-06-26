import "@chestnut-chat/env/web";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  experimental: {
    payloadExtraction: "client",
  },
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  devServer: {
    port: 3011,
  },
  vite: {
    optimizeDeps: {
      include: ["@tanstack/vue-query", "@tanstack/vue-query-devtools", "@vue/devtools-api"],
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
