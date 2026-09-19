<template>
  <section
    class="rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card"
  >
    <slot name="header" />
    <slot />
    <slot name="footer" />
  </section>
</template>
