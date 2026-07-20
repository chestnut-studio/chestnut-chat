<template>
  <div class="flex min-h-full items-center justify-center" role="status">
    <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
    <span class="sr-only">{{ $t("chat.loadingHistory") }}</span>
  </div>
</template>
