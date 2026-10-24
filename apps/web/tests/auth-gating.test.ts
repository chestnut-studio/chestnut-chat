import { it } from "node:test";
import assert from "node:assert/strict";
import { computed, reactive, readonly, shallowRef, type Ref } from "vue";
import { useAuthSession } from "../app/composables/useAuthSession";
import { useLoginModal } from "../app/composables/useLoginModal";
import { useSettingsModal } from "../app/composables/useSettingsModal";

it("requires login for protected actions and settings, then allows them after signing in", async () => {
  const state = new Map<string, Ref>();
  let session: { user: { id: string } } | null = null;

  Object.assign(globalThis, {
    computed,
    reactive,
    readonly,
    useState: <T>(key: string, init: () => T) => {
      if (!state.has(key)) state.set(key, shallowRef(init()));
      return state.get(key);
    },
    useNuxtApp: () => ({
      $authClient: { getSession: async () => ({ data: session, error: null }) },
    }),
    useAuthSession,
    useLoginModal,
  });

  const auth = useAuthSession();
  const login = useLoginModal();
  const settings = useSettingsModal();
  await auth.ensure();

  assert.equal(auth.requireAuth(), false);
  assert.equal(login.open.value, true);
  login.hide();
  settings.show("providers");
  assert.equal(login.open.value, true);
  assert.equal(settings.open.value, false);
  assert.equal(settings.page.value, "account");

  login.hide();
  session = { user: { id: "signed-in-user" } };
  await auth.refresh();
  assert.equal(auth.requireAuth(), true);
  settings.show("providers");
  assert.equal(login.open.value, false);
  assert.equal(settings.open.value, true);
  assert.equal(settings.page.value, "providers");

  settings.hide();
  auth.clear();
  assert.equal(auth.requireAuth(), false);
  assert.equal(login.open.value, true);
});
