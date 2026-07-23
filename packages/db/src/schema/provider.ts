import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const providerKindEnum = pgEnum("provider_kind", ["builtin", "custom"]);

export type ProviderKind = (typeof providerKindEnum.enumValues)[number];

export type ProviderModel = {
  id: string;
  name?: string;
  ownedBy?: string;
  supportsReasoning?: boolean;
  supportsVision?: boolean;
  inputModalities?: string[];
  outputModalities?: string[];
  supportedParameters?: string[];
  source: "fetched" | "manual";
};

export const providerSetting = pgTable(
  "provider_setting",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: providerKindEnum("kind").notNull(),
    providerId: text("provider_id").notNull(),
    name: text("name").notNull(),
    apiKeyEncrypted: text("api_key_encrypted").notNull(),
    baseUrl: text("base_url"),
    enabled: boolean("enabled").default(true).notNull(),
    models: jsonb("models")
      .$type<ProviderModel[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    lastModelsSyncAt: timestamp("last_models_sync_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("provider_setting_userId_idx").on(table.userId),
    uniqueIndex("provider_setting_userId_kind_providerId_idx").on(
      table.userId,
      table.kind,
      table.providerId,
    ),
  ],
);

export const providerSettingRelations = relations(providerSetting, ({ one }) => ({
  user: one(user, {
    fields: [providerSetting.userId],
    references: [user.id],
  }),
}));
