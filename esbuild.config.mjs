import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { execSync } from "child_process";
import { cp } from "fs/promises";
import { existsSync } from "fs";

const isProduction = process.argv[2] === "production";

// Path to your local Obsidian test vault — change this for your setup.
// The plugin will be copied here automatically in dev mode.
const TEST_VAULT_PLUGIN_PATH = process.env.OBSIDIAN_VAULT_PLUGIN_PATH;

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: isProduction ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: isProduction,
});

// Build CSS via Tailwind v4 CLI
function buildCss() {
  try {
    execSync(
      `npx @tailwindcss/cli -i src/styles/tailwind.css -o styles.css${isProduction ? " --minify" : ""}`,
      { stdio: "inherit" }
    );
  } catch {
    console.warn("Tailwind CSS build skipped (CLI not available yet).");
  }
}

if (isProduction) {
  await context.rebuild();
  buildCss();
  await context.dispose();
  console.log("Production build complete: main.js + styles.css");
} else {
  buildCss();
  await context.watch();
  console.log("Watching for changes...");

  if (TEST_VAULT_PLUGIN_PATH && existsSync(TEST_VAULT_PLUGIN_PATH)) {
    // Copy output files to test vault on each rebuild
    const filesToCopy = ["main.js", "styles.css", "manifest.json"];
    setInterval(async () => {
      for (const file of filesToCopy) {
        if (existsSync(file)) {
          await cp(file, `${TEST_VAULT_PLUGIN_PATH}/${file}`).catch(() => {});
        }
      }
    }, 1000);
    console.log(`Auto-copying to: ${TEST_VAULT_PLUGIN_PATH}`);
  }
}
