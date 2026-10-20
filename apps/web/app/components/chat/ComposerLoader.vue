<script setup lang="ts">
defineProps<{ active?: boolean }>();
</script>

<template>
  <div class="composer-loader relative rounded-3xl" :data-active="active || undefined">
    <slot />
  </div>
</template>

<style scoped>
.composer-loader::before {
  content: "";
  position: absolute;
  inset: -1.5px;
  z-index: 1;
  border-radius: calc(var(--radius-3xl) + 1.5px);
  padding: 1.5px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 200ms ease;
  background: conic-gradient(
    from var(--orbit-angle),
    transparent 0 55%,
    var(--color-accent-300) 80%,
    var(--color-accent-500) 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box exclude,
    linear-gradient(#000 0 0);
}
.composer-loader[data-active]::before {
  opacity: 1;
  animation: orbit 2.4s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .composer-loader[data-active]::before {
    animation: none;
    background: var(--color-accent-400);
  }
}
</style>
