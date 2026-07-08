import type {
  BuiltinProviderDef,
  ConnectionTestStatus,
  ModelTarget,
  ProviderDraft,
  ProviderEditForm,
  ProviderIconId,
  SettingsProviderCard,
} from "~/types/providers";

interface ManualModelFormState {
  id: string;
  name: string;
}

interface AddProviderMenuItem {
  label: string;
  iconProvider: ProviderIconId;
  onSelect: () => void;
}

function targetKey(target: ModelTarget) {
  return `${target.kind}:${target.id}`;
}

function mergeModels(
  existing: readonly ProviderModel[],
  incoming: readonly ProviderModel[],
): ProviderModel[] {
  const models = new Map<string, ProviderModel>();
  for (const model of existing) {
    models.set(model.id, { ...model });
  }
  for (const model of incoming) {
    models.set(model.id, { ...model });
  }
  return Array.from(models.values());
}

function cloneCustomProvider(provider: Readonly<CustomProvider>): CustomProvider {
  return {
    ...provider,
    models: provider.models?.map((model) => ({ ...model })) ?? [],
  };
}

export function useSettingsProviders() {
  const toast = useToast();
  const { t } = useI18n();
  const {
    storage: providerStorage,
    saveBuiltin,
    removeBuiltin,
    addCustom,
    saveCustom,
    removeCustom,
    getBuiltin,
    fetchProviderModelsForTarget,
    isLoading: isLoadingProviders,
    isSaving: isSavingProvider,
  } = useProviderKeys();

  const fetchingModels = shallowRef<Record<string, boolean>>({});
  const modelCatalogs = shallowRef<Record<string, ProviderModel[]>>({});
  const connectionStatuses = shallowRef<Record<string, ConnectionTestStatus>>({});
  const manualModelOpen = shallowRef(false);
  const manualModelTarget = shallowRef<ModelTarget | null>(null);
  const manualModelForm = reactive<ManualModelFormState>({ id: "", name: "" });
  const providerDraft = shallowRef<ProviderDraft | null>(null);
  const editingProviderKey = shallowRef<string | null>(null);
  const editForm = shallowRef<ProviderEditForm | null>(null);
  const deleteConfirmOpen = shallowRef(false);
  const deleteTarget = shallowRef<SettingsProviderCard | null>(null);

  const configuredBuiltin = computed(() =>
    BUILTIN_PROVIDERS.filter((def) => !!providerStorage.value.builtin[def.id]?.hasApiKey),
  );

  const availableToAdd = computed(() =>
    BUILTIN_PROVIDERS.filter((def) => !providerStorage.value.builtin[def.id]?.hasApiKey),
  );

  const addProviderItems = computed<AddProviderMenuItem[][]>(() => [
    availableToAdd.value.map((def) => ({
      label: def.name,
      iconProvider: def.id,
      onSelect: () => startBuiltinDraft(def),
    })),
    [
      {
        label: t("settings.customProvider"),
        iconProvider: "custom",
        onSelect: startCustomDraft,
      },
    ],
  ]);

  const providers = computed<SettingsProviderCard[]>(() => [
    ...configuredBuiltin.value.map((def): SettingsProviderCard => {
      const entry = getBuiltin(def.id);
      return {
        kind: "builtin",
        id: def.id,
        name: entry.name?.trim() || def.name,
        iconProvider: def.id,
        enabled: entry.enabled,
        models: entry.models ?? [],
      };
    }),
    ...providerStorage.value.custom.map(
      (provider): SettingsProviderCard => ({
        kind: "custom",
        id: provider.id,
        name: provider.name,
        iconProvider: "custom",
        enabled: provider.enabled,
        models: provider.models ?? [],
      }),
    ),
  ]);

  const hasAnyProvider = computed(() => providers.value.length > 0);

  const manualModelProviderName = computed(() => {
    const target = manualModelTarget.value;
    if (!target) return "";
    if (target.kind === "builtin") return getBuiltinProviderDef(target.id)?.name ?? "";
    return providerStorage.value.custom.find((provider) => provider.id === target.id)?.name ?? "";
  });

  const deleteProviderName = computed(() => deleteTarget.value?.name ?? "");

  function getCustomProvider(id: string) {
    const provider = providerStorage.value.custom.find((item) => item.id === id);
    return provider ? cloneCustomProvider(provider) : null;
  }

  function getModels(target: ModelTarget) {
    if (target.kind === "builtin") return getBuiltin(target.id).models ?? [];
    return getCustomProvider(target.id)?.models ?? [];
  }

  function errorDescription(error: unknown) {
    return error instanceof Error ? error.message : undefined;
  }

  function providerTarget(provider: SettingsProviderCard): ModelTarget {
    return provider.kind === "builtin"
      ? { kind: "builtin", id: provider.id }
      : { kind: "custom", id: provider.id };
  }

  async function setModels(target: ModelTarget, models: readonly ProviderModel[]) {
    const lastModelsSyncAt = new Date().toISOString();

    if (target.kind === "builtin") {
      const existing = getBuiltin(target.id);
      await saveBuiltin(target.id, { ...existing, models, lastModelsSyncAt });
      return;
    }

    const existing = getCustomProvider(target.id);
    if (!existing) return;
    await saveCustom({ ...existing, models, lastModelsSyncAt });
  }

  function startBuiltinDraft(def: BuiltinProviderDef) {
    cancelEditProvider();
    providerDraft.value = {
      kind: "builtin",
      builtinId: def.id,
      title: t("settings.addProviderTitle", { name: def.name }),
      iconProvider: def.id,
      displayName: def.name,
      apiKey: "",
      apiKeyRequired: true,
      baseUrl: def.defaultBaseUrl ?? def.urlPlaceholder ?? "",
      keyPlaceholder: def.keyPlaceholder,
      baseUrlPlaceholder: def.urlPlaceholder ?? def.defaultBaseUrl ?? "https://api.example.com/v1",
      showBaseUrl: def.hasBaseUrl || !!def.defaultBaseUrl,
    };
  }

  function startCustomDraft() {
    cancelEditProvider();
    providerDraft.value = {
      kind: "custom",
      title: t("settings.addProviderTitle", { name: t("settings.customProvider") }),
      iconProvider: "custom",
      displayName: "",
      apiKey: "",
      apiKeyRequired: true,
      baseUrl: "",
      keyPlaceholder: "sk-...",
      baseUrlPlaceholder: "https://api.example.com/v1",
      showBaseUrl: true,
    };
  }

  function cancelProviderDraft() {
    providerDraft.value = null;
  }

  function updateProviderDraft(patch: Partial<ProviderDraft>) {
    if (!providerDraft.value) return;
    providerDraft.value = { ...providerDraft.value, ...patch };
  }

  async function submitProviderDraft() {
    const draft = providerDraft.value;
    if (!draft || !draft.displayName.trim() || !draft.apiKey.trim()) return;
    if (draft.showBaseUrl && !draft.baseUrl.trim()) return;

    try {
      if (draft.kind === "builtin" && draft.builtinId) {
        const existing = getBuiltin(draft.builtinId);
        const def = getBuiltinProviderDef(draft.builtinId);
        await saveBuiltin(draft.builtinId, {
          ...existing,
          name: draft.displayName.trim(),
          apiKey: draft.apiKey.trim(),
          baseUrl: draft.baseUrl.trim() || undefined,
          enabled: existing.hasApiKey ? existing.enabled : true,
        });
        toast.add({
          title: t("settings.providerAdded", { name: draft.displayName.trim() || def?.name }),
        });
      } else {
        await addCustom({
          name: draft.displayName.trim(),
          apiKey: draft.apiKey.trim(),
          baseUrl: draft.baseUrl.trim(),
          enabled: true,
          models: [],
        });
        toast.add({ title: t("settings.providerAdded", { name: draft.displayName.trim() }) });
      }

      providerDraft.value = null;
    } catch (error) {
      toast.add({
        title: t("settings.providerSaveFailed"),
        description: errorDescription(error),
        color: "error",
      });
    }
  }

  async function deleteBuiltinProvider(id: BuiltinProviderDef["id"]) {
    const def = getBuiltinProviderDef(id);
    await removeBuiltin(id);
    toast.add({ title: t("settings.providerRemoved", { name: def?.name ?? id }) });
  }

  async function deleteCustomProvider(id: string) {
    const provider = getCustomProvider(id);
    await removeCustom(id);
    toast.add({ title: t("settings.providerRemoved", { name: provider?.name ?? id }) });
  }

  function updateEditForm(patch: Partial<ProviderEditForm>) {
    if (!editForm.value) return;
    editForm.value = { ...editForm.value, ...patch };
  }

  function isEditingProvider(provider: SettingsProviderCard) {
    return editingProviderKey.value === targetKey(provider);
  }

  function cancelEditProvider() {
    editingProviderKey.value = null;
    editForm.value = null;
  }

  function resetConnectionStatus(provider: SettingsProviderCard) {
    const next = { ...connectionStatuses.value };
    delete next[targetKey(provider)];
    connectionStatuses.value = next;
  }

  function resetModelCatalog(provider: SettingsProviderCard) {
    const next = { ...modelCatalogs.value };
    delete next[targetKey(provider)];
    modelCatalogs.value = next;
  }

  function editProvider(provider: SettingsProviderCard) {
    providerDraft.value = null;
    editingProviderKey.value = targetKey(provider);

    if (provider.kind === "builtin") {
      const def = getBuiltinProviderDef(provider.id);
      const existing = getBuiltin(provider.id);
      editForm.value = {
        displayName: existing.name?.trim() || def?.name || provider.name,
        apiKey: "",
        apiKeyRequired: false,
        baseUrl: existing.baseUrl ?? def?.defaultBaseUrl ?? def?.urlPlaceholder ?? "",
        keyPlaceholder: def?.keyPlaceholder ?? "sk-...",
        baseUrlPlaceholder:
          def?.urlPlaceholder ?? def?.defaultBaseUrl ?? "https://api.example.com/v1",
        showBaseUrl: !!def && (def.hasBaseUrl || !!def.defaultBaseUrl),
      };
      return;
    }

    const existing = getCustomProvider(provider.id);
    if (!existing) {
      cancelEditProvider();
      return;
    }

    editForm.value = {
      displayName: existing.name,
      apiKey: "",
      apiKeyRequired: false,
      baseUrl: existing.baseUrl,
      keyPlaceholder: "sk-...",
      baseUrlPlaceholder: "https://api.example.com/v1",
      showBaseUrl: true,
    };
  }

  async function submitEditProvider(provider: SettingsProviderCard) {
    const form = editForm.value;
    if (!form || !isEditingProvider(provider)) return;
    if (!form.displayName.trim()) return;
    if (form.apiKeyRequired && !form.apiKey.trim()) return;
    if (form.showBaseUrl && !form.baseUrl.trim()) return;

    const name = form.displayName.trim();
    try {
      if (provider.kind === "builtin") {
        const existing = getBuiltin(provider.id);
        await saveBuiltin(provider.id, {
          ...existing,
          name,
          apiKey: form.apiKey.trim() || undefined,
          baseUrl: form.showBaseUrl ? form.baseUrl.trim() || undefined : existing.baseUrl,
        });
      } else {
        const existing = getCustomProvider(provider.id);
        if (!existing) return;
        await saveCustom({
          ...existing,
          name,
          apiKey: form.apiKey.trim() || undefined,
          baseUrl: form.baseUrl.trim(),
        });
      }

      toast.add({ title: t("settings.providerSaved", { name }) });
      resetConnectionStatus(provider);
      resetModelCatalog(provider);
      cancelEditProvider();
    } catch (error) {
      toast.add({
        title: t("settings.providerSaveFailed"),
        description: errorDescription(error),
        color: "error",
      });
    }
  }

  async function deleteProvider(provider: SettingsProviderCard) {
    if (isEditingProvider(provider)) cancelEditProvider();
    resetConnectionStatus(provider);
    resetModelCatalog(provider);

    try {
      if (provider.kind === "builtin") {
        await deleteBuiltinProvider(provider.id);
        return;
      }

      await deleteCustomProvider(provider.id);
    } catch (error) {
      toast.add({
        title: t("settings.providerDeleteFailed"),
        description: errorDescription(error),
        color: "error",
      });
    }
  }

  function requestDeleteProvider(provider: SettingsProviderCard) {
    deleteTarget.value = provider;
    deleteConfirmOpen.value = true;
  }

  function cancelDeleteProvider() {
    deleteConfirmOpen.value = false;
    deleteTarget.value = null;
  }

  async function confirmDeleteProvider() {
    const provider = deleteTarget.value;
    if (!provider) return;

    await deleteProvider(provider);
    cancelDeleteProvider();
  }

  async function fetchModelsForProvider(provider: SettingsProviderCard) {
    const key = targetKey(provider);
    fetchingModels.value = { ...fetchingModels.value, [key]: true };

    try {
      const models = await fetchProviderModelsForTarget(providerTarget(provider));

      modelCatalogs.value = { ...modelCatalogs.value, [key]: models };
    } catch (error) {
      toast.add({
        title: t("settings.modelsFetchFailed", { name: provider.name }),
        description: error instanceof Error ? error.message : undefined,
        color: "error",
      });
    } finally {
      fetchingModels.value = { ...fetchingModels.value, [key]: false };
    }
  }

  function isFetchingModels(provider: SettingsProviderCard) {
    return !!fetchingModels.value[targetKey(provider)];
  }

  function modelCatalogForProvider(provider: SettingsProviderCard) {
    return modelCatalogs.value[targetKey(provider)] ?? [];
  }

  function ensureModelCatalog(provider: SettingsProviderCard) {
    const key = targetKey(provider);
    if (
      Object.prototype.hasOwnProperty.call(modelCatalogs.value, key) ||
      isFetchingModels(provider)
    ) {
      return;
    }

    void fetchModelsForProvider(provider);
  }

  async function addFetchedModel(provider: SettingsProviderCard, model: ProviderModel) {
    try {
      await setModels(
        provider,
        mergeModels(getModels(provider), [{ ...model, source: "fetched" }]),
      );
    } catch (error) {
      toast.add({
        title: t("settings.modelsSaveFailed"),
        description: errorDescription(error),
        color: "error",
      });
    }
  }

  async function testConnectionForProvider(provider: SettingsProviderCard) {
    connectionStatuses.value = {
      ...connectionStatuses.value,
      [targetKey(provider)]: "testing",
    };

    try {
      await fetchProviderModelsForTarget(providerTarget(provider));
      connectionStatuses.value = {
        ...connectionStatuses.value,
        [targetKey(provider)]: "success",
      };
    } catch {
      connectionStatuses.value = {
        ...connectionStatuses.value,
        [targetKey(provider)]: "error",
      };
    }
  }

  function connectionStatusForProvider(provider: SettingsProviderCard) {
    return connectionStatuses.value[targetKey(provider)] ?? "idle";
  }

  function openManualModel(provider: SettingsProviderCard) {
    manualModelTarget.value =
      provider.kind === "builtin"
        ? { kind: "builtin", id: provider.id }
        : { kind: "custom", id: provider.id };
    manualModelForm.id = "";
    manualModelForm.name = "";
    manualModelOpen.value = true;
  }

  async function submitManualModel() {
    const target = manualModelTarget.value;
    if (!target || !manualModelForm.id.trim()) return;

    const model: ProviderModel = {
      id: manualModelForm.id.trim(),
      name: manualModelForm.name.trim() || undefined,
      source: "manual",
    };
    try {
      await setModels(target, mergeModels(getModels(target), [model]));
      toast.add({
        title: t("settings.modelAdded", {
          id: model.id,
          name: manualModelProviderName.value,
        }),
      });
      manualModelOpen.value = false;
    } catch (error) {
      toast.add({
        title: t("settings.modelsSaveFailed"),
        description: errorDescription(error),
        color: "error",
      });
    }
  }

  async function removeModel(provider: SettingsProviderCard, modelId: string) {
    try {
      await setModels(
        provider,
        getModels(provider).filter((model) => model.id !== modelId),
      );
    } catch (error) {
      toast.add({
        title: t("settings.modelsSaveFailed"),
        description: errorDescription(error),
        color: "error",
      });
    }
  }

  return {
    addProviderItems,
    providers,
    hasAnyProvider,
    isLoadingProviders,
    isSavingProvider,
    providerDraft,
    cancelProviderDraft,
    submitProviderDraft,
    updateProviderDraft,
    editForm,
    isEditingProvider,
    cancelEditProvider,
    submitEditProvider,
    updateEditForm,
    editProvider,
    requestDeleteProvider,
    cancelDeleteProvider,
    confirmDeleteProvider,
    deleteConfirmOpen,
    deleteProviderName,
    testConnectionForProvider,
    connectionStatusForProvider,
    fetchModelsForProvider,
    isFetchingModels,
    modelCatalogForProvider,
    ensureModelCatalog,
    addFetchedModel,
    openManualModel,
    removeModel,
    manualModelOpen,
    manualModelForm,
    manualModelProviderName,
    submitManualModel,
  };
}
