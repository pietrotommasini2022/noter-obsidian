# noter — AI-powered academic notes for Obsidian

Turn raw lecture notes into a clean, structured **sbobina** — the Italian student term for the polished transcript of a lecture, used as primary study material — directly inside your Obsidian vault. Bring your own Gemini API key, no accounts, no servers, no subscriptions.

The plugin follows your Obsidian theme automatically: typography, accent colour, light/dark mode are all inherited from whatever theme you have active.

---

## Features

- **Deploy** raw notes → structured lesson block (Obsidian-flavoured markdown), appended to a per-subject sbobina file you can keep editing by hand
- **Folder picker for subjects** — browse your vault, pick the folder that holds your study material, and choose which subdirectories to import as subjects (Audio and Concepts are reserved). New subjects can also be added manually
- **Raw-notes archive** — every Save persists the *exact* input you wrote, alongside the AI-generated block. You always have the original text on disk in `<Subject>/RawNotes/` and listed in History
- **Concept vault** — AI extracts cross-subject key concepts, deduplicates them against existing ones, and writes each as a `[[wikilink]]`-ready `.md` file
- **Audio transcription** — record lectures, transcribe with Gemini Flash, auto-fill `gap:` markers from what was said
- **Vocabulary markers** — eight tokens (`def:`, `gap:`, `imp:`, `exam:`, `clar:`, `link:`, `ex:`, `todo:`) that change how the AI handles each line. `clar:` in particular is now wired to draw on broader subject knowledge — not just the surrounding notes — so it behaves like asking a textbook for an explanation, then weaving the answer back into your transcript
- **History with two views**
  - *Sbobina versions* — restore a previous AI output as the current sbobina
  - *Raw notes* — reopen any past raw input file from your vault
- **BYOK** — your Gemini API key lives in `data.json`, never sent anywhere except directly to Google
- **Local-first** — every artifact (sbobine, raw notes, AI archives, concepts, audio, images) is a real file in your vault. Sync via Obsidian Sync, Git, iCloud, Syncthing, whatever you already use

---

## Quick start

1. Install from the Obsidian Community Plugin browser, or follow the manual install steps below
2. Open the noter pane via the ribbon icon or `Cmd/Ctrl+P → Open noter`
3. Open Settings, paste your [Gemini API key](https://aistudio.google.com/app/apikey)
4. Click **Browse…** next to *Notes folder* and pick the folder in your vault that holds (or will hold) your subject directories. Tick the subdirectories you want to import as subjects, or skip the import to start from scratch
5. Pick a subject tab, write raw notes (use the vocabulary markers to give the AI hints), press **Deploy**, review the lesson block in the side panel, press **Save ✓**

---

## Vocabulary markers

These tokens, written at the start of a line, change how the AI handles the rest of that line. They mirror the entries in `src/lib/dictionary.ts`, which is the single source of truth — the in-app help modal, the editor highlight colours, and the AI prompt all derive from there.

| Token   | Meaning                                                                                                          |
|---------|------------------------------------------------------------------------------------------------------------------|
| `def:`  | Definition — AI rewrites it cleanly without losing information                                                   |
| `gap:`  | Missing/misheard passage — AI inserts the literal placeholder `==MISSING==` so you spot it later                 |
| `imp:`  | Important point — AI gives it more prominence in the structure                                                   |
| `exam:` | High-priority point likely to come up in the exam                                                                |
| `clar:` | Topic to explain from broader knowledge — AI generates an explanation as if from a textbook and integrates it    |
| `link:` | Cross-cutting concept — AI keeps the content and adds a `[[wikilink]]` to an existing concept if relevant         |
| `ex:`   | Example — AI keeps it visually distinct from theory                                                              |
| `todo:` | Follow-up to verify or study later — AI keeps it as an operational open point                                    |

Each marker has a distinct highlight colour in the notes editor.

---

## File layout

noter creates the following structure inside your vault (default folder: `Notes/`):

```
Notes/
├── <SubjectName>/
│   ├── <SubjectName>.md                      ← main sbobina (append-only)
│   ├── Archive/
│   │   └── <Subject> - YYYY-MM-DD HH-MM-SS.md ← per-deploy AI block snapshot
│   ├── RawNotes/
│   │   └── <Subject> - YYYY-MM-DD HH-MM-SS.md ← per-deploy verbatim raw input
│   └── Images/
│       └── <filename>                        ← pasted images
├── Audio/
│   └── <recordingId>/
│       └── *.webm                            ← audio chunks
└── Concepts/
    └── <ConceptTitle>.md                     ← one file per concept
```

`Archive/` and `RawNotes/` files for the same lesson share the same timestamp, so an AI block and the input that produced it are easy to pair up.

---

## Manual installation

1. Download the latest release (`main.js`, `styles.css`, `manifest.json`) from the [GitHub Releases page](https://github.com/pietrotommasini2022/noter-obsidian/releases)
2. Copy the three files into `<your-vault>/.obsidian/plugins/noter/`
3. Enable the plugin in **Settings → Community plugins**

---

## Development

```bash
git clone https://github.com/pietrotommasini2022/noter-obsidian
cd noter-obsidian
npm install --legacy-peer-deps

# Watch mode + auto-copy to a test vault on each rebuild
OBSIDIAN_VAULT_PLUGIN_PATH="/path/to/vault/.obsidian/plugins/noter" npm run dev

# Production build — produces main.js + styles.css in the project root
npm run build

# TypeScript type-check only
npm run lint
```

For a release: bump `version` in `manifest.json`, `package.json`, and add an entry to `versions.json` (mapping the new version to the minimum compatible Obsidian version), then `git tag <version>` (no `v` prefix — Obsidian's marketplace ignores `v`-prefixed tags) and create a GitHub Release with `main.js`, `manifest.json`, `styles.css` attached as binary assets.

---

## Contributing

This plugin is intentionally small and modular. Good first contributions:

- New vocabulary markers — add to `src/lib/dictionary.ts` (cssClass + colour included). The editor highlight, the in-app help modal, and the AI prompt will pick it up automatically.
- Support for other AI providers — `src/GeminiClient.ts` is the only network surface; swap it for an OpenAI/Anthropic/local-LLM client and the rest of the pipeline keeps working.
- Mobile UI improvements — the React UI works on mobile but hasn't been hand-tuned for touch.
- Better diff view in the post-deploy preview — currently shows the merged sbobina, could highlight what's actually new.

Please open an issue before starting a large feature so we can coordinate.

---

## License

MIT
