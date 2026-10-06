<script setup lang="ts">
import { computed } from "vue";
import { REGEXP_ONLY_DIGITS } from "vue-input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
withDefaults(defineProps<{ length?: number; disabled?: boolean }>(), { length: 6 });
const model = defineModel<number[]>({ default: () => [] });
const emit = defineEmits<{ complete: [value: number[]] }>();
const value = computed({
  get: () => model.value.join(""),
  set: (value: string) => {
    model.value = Array.from(value, Number);
  },
});
</script>
<template>
  <InputOTP
    v-model="value"
    :maxlength="length"
    :disabled="disabled"
    :pattern="REGEXP_ONLY_DIGITS"
    inputmode="numeric"
    autocomplete="one-time-code"
    @complete="emit('complete', model)"
  >
    <InputOTPGroup
      ><InputOTPSlot v-for="index in length" :key="index" :index="index - 1"
    /></InputOTPGroup>
  </InputOTP>
</template>
