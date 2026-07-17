<script setup lang="ts">
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";
import { toast } from "vue-sonner";
import * as z from "zod";

const { $authClient } = useNuxtApp();
const authSession = useAuthSession();

const emit = defineEmits(["switchToSignUp"]);

const loading = ref(false);

const fields: AuthFormField[] = [
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Enter your password",
    required: true,
  },
];

const schema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type Schema = z.output<typeof schema>;

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;
  try {
    await $authClient.signIn.email(
      {
        email: event.data.email,
        password: event.data.password,
      },
      {
        onSuccess: async () => {
          await authSession.refresh();
          toast.success("Sign in successful");
          await navigateTo("/", { replace: true });
        },
        onError: (error) => {
          toast.error("Sign in failed", { description: error.error.message });
        },
      },
    );
  } catch (error: any) {
    toast.error("An unexpected error occurred", {
      description: error.message || "Please try again.",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        :fields="fields"
        title="Welcome Back"
        icon="i-lucide-log-in"
        :submit="{ label: 'Sign In', loading }"
        @submit="onSubmit"
      >
        <template #description>
          Need an account?
          <ULink class="text-primary font-medium" @click="$emit('switchToSignUp')"> Sign Up </ULink>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
