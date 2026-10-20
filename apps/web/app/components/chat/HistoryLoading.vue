<template>
  <div class="flex min-h-full items-center justify-center" role="status">
    <BIcon name="i-ri-loader-4-line" class="size-6 animate-spin text-accent-600" />
    <span class="sr-only">{{ $t("chat.loadingHistory") }}</span>
  </div>
</template>
