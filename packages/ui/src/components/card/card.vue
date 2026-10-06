<script setup lang="ts">
import { Card, CardHeader, CardContent, CardFooter } from "../ui/card";
</script>
<template>
  <Card>
    <CardHeader v-if="$slots.header"><slot name="header" /></CardHeader>
    <CardContent><slot /></CardContent>
    <CardFooter v-if="$slots.footer"><slot name="footer" /></CardFooter>
  </Card>
</template>
