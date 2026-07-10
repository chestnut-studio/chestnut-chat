import type { Component } from "vue";
import type { BuiltinProviderId, ProviderModel } from "~/composables/useProviderKeys";

export type ProviderFetchMode = "openai" | "catalog";
export type ProviderIconId = BuiltinProviderId | "custom";

export interface BuiltinProviderDef {
  id: BuiltinProviderId;
  name: string;
  icon: string | Component;
  hasBaseUrl: boolean;
  defaultBaseUrl?: string;
  keyPlaceholder: string;
  urlPlaceholder?: string;
  fetchMode: ProviderFetchMode;
}

export type ModelTarget =
  | { kind: "builtin"; id: BuiltinProviderId }
  | { kind: "custom"; id: string };

interface ProviderCardBase {
  name: string;
  iconProvider: ProviderIconId;
  enabled: boolean;
  models: readonly ProviderModel[];
}

export interface BuiltinProviderCard extends ProviderCardBase {
  kind: "builtin";
  id: BuiltinProviderId;
}

export interface CustomProviderCard extends ProviderCardBase {
  kind: "custom";
  id: string;
}

export type SettingsProviderCard = BuiltinProviderCard | CustomProviderCard;

export type ProviderDraftKind = "builtin" | "custom";

export interface ProviderFormFields {
  displayName: string;
  apiKey: string;
  apiKeyRequired: boolean;
  baseUrl: string;
  keyPlaceholder: string;
  baseUrlPlaceholder: string;
  showBaseUrl: boolean;
}

export interface ProviderDraft extends ProviderFormFields {
  kind: ProviderDraftKind;
  builtinId?: BuiltinProviderId;
  title: string;
  iconProvider: ProviderIconId;
}

export type ProviderEditForm = ProviderFormFields;

export type ConnectionTestStatus = "idle" | "testing" | "success" | "error";
