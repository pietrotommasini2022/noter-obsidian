# noter — AI-powered academic notes for Obsidian

Transform raw lecture notes into structured study material using your own Gemini API key. Works entirely offline (except for the AI call) — no accounts, no servers, no subscriptions.

---

## Features

- **Deploy** raw notes → structured sbobina (transcript for international students) (Obsidian-flavoured markdown) in one click
- **Concept vault** — AI extracts cross-subject key concepts, deduplicates them, and saves each as a `[[wikilink]]`-ready `.md` file
- **Audio transcription** — record lectures, transcribe with Gemini Flash, auto-fill `gap:` markers
- **Vocabulary markers** — `def:`, `gap:`, `imp:`, `exam:`, `clar:`, `link:`, `ex:`, `todo:`
- **History** — last 20 versions of each sbobina, restorable in one click
- **BYOK** — your Gemini API key, stored locally in `data.json`, never sent anywhere else
- **Local-first** — all files live in your vault; sync via Obsidian Sync, Git, or any cloud you trust

---

## Quick start

1. Install from the Obsidian Community Plugin browser (or manually — see below)
2. Open **Settings → noter** and paste your [Gemini API key](https://aistudio.google.com/app/apikey)
3. Add your subjects
4. Open the noter pane via the ribbon icon or `Cmd/Ctrl+P → Open noter`
5. Write raw notes, press **Deploy**, review the lesson block, press **Save ✓**

---

## Vocabulary markers

These tokens trigger special AI behaviour. They apply to the rest of the line:

| Token   | Meaning                                   |
|---------|-------------------------------------------|
| `def:`  | Definition — AI cleans and formats it     |
| `gap:`  | Missing note → AI inserts `==MISSING==`|
| `imp:`  | Important point                           |
| `exam:` | High-priority (exam-relevant)             |
| `clar:` | Needs clarification                       |
| `link:` | Cross-reference to existing concept       |
| `ex:`   | Example — kept distinct from theory       |
| `todo:` | Follow-up task                            |

---

## File layout

noter creates the following structure inside your vault (default folder: `Notes/`):

```
Notes/
├── <SubjectName>/
│   ├── <SubjectName>.md        ← main sbobina (append-only)
│   ├── Archive/
│   │   └── <Subject> - YYYY-MM-DD HH-MM-SS.md   ← per-lesson archive
│   └── Images/
│       └── <filename>          ← pasted images
├── Audio/
│   └── <recordingId>/
│       └── *.webm              ← audio chunks
└── Concepts/
    └── <ConceptTitle>.md       ← one file per concept
```

---

## Manual installation

1. Download the latest release (`main.js`, `styles.css`, `manifest.json`)
2. Copy them to `<your-vault>/.obsidian/plugins/noter/`
3. Enable the plugin in **Settings → Community plugins**

---

## Development

```bash
git clone https://github.com/pietrotommasini2022/noter-obsidian
cd noter-obsidian
npm install --legacy-peer-deps

# Development (watch mode + auto-copy to test vault)
OBSIDIAN_VAULT_PLUGIN_PATH="/path/to/vault/.obsidian/plugins/noter" npm run dev

# Production build
npm run build
```

Output: `main.js` + `styles.css` — copy both (along with `manifest.json`) into your vault's plugin folder.

---

## Contributing

This plugin is intentionally open and modular. Good first contributions:

- New vocabulary markers (add to `src/lib/dictionary.ts` + update the system prompt in `src/lib/prompts.ts`)
- Localisation (add a language to the `translations` object — Italian is the default)
- Mobile UI improvements
- Support for other AI providers (swap `src/GeminiClient.ts`)

Please open an issue before starting a large feature so we can coordinate.

---

## License

MIT
