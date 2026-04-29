/**
 * Shared plugin type used across hooks and components.
 * The concrete class is defined in src/main.ts — this interface avoids
 * circular imports when importing from hooks or components.
 */

import type { Plugin, Vault, App } from "obsidian";
import type { NoterPluginSettings } from "@/settings";

export interface NoterPlugin extends Plugin {
  settings: NoterPluginSettings;
  app: App;
}

// Convenience re-export so hooks only need one import.
export type { Vault, App };
