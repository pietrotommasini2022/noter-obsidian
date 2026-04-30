/**
 * NoterView — Obsidian ItemView that hosts the noter React application.
 *
 * Lifecycle:
 *   onOpen  → create React root, mount <NoterApp plugin={this.plugin} />
 *   onClose → unmount React root to prevent memory leaks
 */

import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import React from "react";
import { NoterApp } from "@/components/NoterApp";
import type { NoterPlugin } from "@/types/plugin";

export const NOTER_VIEW_TYPE = "noter-ai-view";

export class NoterView extends ItemView {
  private root: Root | null = null;
  private plugin: NoterPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: NoterPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return NOTER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Noter";
  }

  getIcon(): string {
    return "pencil";
  }

  onOpen(): void {
    // containerEl.children[1] is the content area (children[0] is the header)
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    // Mount the React app
    this.root = createRoot(container);
    this.root.render(
      React.createElement(NoterApp, { plugin: this.plugin })
    );
  }

  onClose(): void {
    // Unmount React to clean up all hooks and subscriptions
    this.root?.unmount();
    this.root = null;
  }
}
