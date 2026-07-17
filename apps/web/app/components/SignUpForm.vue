<script setup lang="ts">
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";
import { toast } from "vue-sonner";
import * as z from "zod";

const { $authClient } = useNuxtApp();
const authSession = useAuthSession();

const emit = defineEmits(["switchToSignIn"]);

const loading = ref(false);

const fields: AuthFormField[] = [
  {
    name: "name",
    type: "text",
    label: "Name",
    placeholder: "Enter your name",
    required: true,
  },
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
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type Schema = z.output<typeof schema>;

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;
  try {
    await $authClient.signUp.email(
      {
        name: event.data.name,
        email: event.data.email,
        password: event.data.password,
      },
      {
        onSuccess: async () => {
          await authSession.refresh();
          toast.success("Sign up successful");
          await navigateTo("/", { replace: true });
        },
        onError: (error) => {
          toast.error("Sign up failed", { description: error.error.message });
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
        title="Create Account"
        icon="i-lucide-user-plus"
        :submit="{ label: 'Sign Up', loading }"
        @submit="onSubmit"
      >
        <template #description>
          Already have an account?
          <ULink class="text-primary font-medium" @click="$emit('switchToSignIn')"> Sign In </ULink>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
