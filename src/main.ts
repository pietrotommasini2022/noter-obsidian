/**
 * noter — Obsidian Plugin main entry point.
 *
 * Responsibilities:
 *  - Load settings from data.json on startup
 *  - Register the noter ItemView
 *  - Add a ribbon icon + command to open/focus the noter pane
 *  - Preserve the user's noter leaf placement across reloads
 */

import { Plugin } from "obsidian";
import { NoterView, NOTER_VIEW_TYPE } from "@/view";
import { DEFAULT_SETTINGS, type NoterPluginSettings } from "@/settings";

export default class NoterPlugin extends Plugin {
  settings!: NoterPluginSettings;

  async onload(): Promise<void> {
    // ── Load settings ──────────────────────────────────────────────────────
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );

    // ── Register the view ──────────────────────────────────────────────────
    this.registerView(
      NOTER_VIEW_TYPE,
      (leaf) => new NoterView(leaf, this)
    );

    // ── Ribbon icon ────────────────────────────────────────────────────────
    this.addRibbonIcon("pencil", "Open noter", () => {
      void this.activateView();
    });

    // ── Command palette ────────────────────────────────────────────────────
    this.addCommand({
      id: "open",
      name: "Open",
      callback: () => void this.activateView(),
    });

    // ── Workspace: restore pane if it was open ─────────────────────────────
    if (this.app.workspace.layoutReady) {
      void this.activateView();
    } else {
      this.app.workspace.onLayoutReady(() => {
        void this.activateView();
      });
    }
  }

  /** Opens noter as a full-width tab in the main content area, or focuses it if already open. */
  async activateView(): Promise<void> {
    const { workspace } = this.app;

    // Reuse existing leaf if available
    const existingLeaves = workspace.getLeavesOfType(NOTER_VIEW_TYPE);
    if (existingLeaves.length > 0) {
      await workspace.revealLeaf(existingLeaves[0]);
      return;
    }

    // Open as a new tab in the main editor area (not the sidebar)
    const leaf = workspace.getLeaf("tab");
    await leaf.setViewState({ type: NOTER_VIEW_TYPE, active: true });
    await workspace.revealLeaf(leaf);
  }
}
