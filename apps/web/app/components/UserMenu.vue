<script setup lang="ts">
import { LogIn, LogOut } from "lucide-vue-next";
import { BButton, BSkeleton } from "@chestnut-chat/ui";

const authSession = useAuthSession();
const signOut = useSignOut();
const { show: showLogin } = useLoginModal();
const hydrated = ref(false);

onMounted(() => {
  hydrated.value = true;
  authSession.ensure();
});
</script>

<template>
  <div>
    <BSkeleton v-if="!hydrated || authSession.isPending" class="h-9 w-24" />

    <BButton
      v-else-if="!authSession.data"
      variant="secondary"
      :leading-icon="LogIn"
      @click="showLogin"
    >
      {{ $t("sidebar.signIn") }}
    </BButton>

    <BButton v-else :leading-icon="LogOut" @click="signOut()">
      {{ $t("settings.signOut") }}
    </BButton>
  </div>
</template>
