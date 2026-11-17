# Test Suite — Salesforce Github Inspector

83 tests across 13 suites (the Copilot / Claude Code usage parsers — `extractCopilotSkillReads`, `parseCopilotChatSession`, `parseClaudeTranscriptLine` — are covered in `src/test/extension.test.ts` and not detailed below). All tests run inside the VS Code extension host via `@vscode/test-cli` / `@vscode/test-electron` and target the compiled output at `out/test/**/*.test.js`.

```
npm run compile   # compile TypeScript first
npm test          # launch VS Code test host and run all suites
```

All tested functions are pure (no VS Code API calls, no side-effects beyond the filesystem) and exported from `src/extension.ts` so the test file can import them directly without activating the extension.

---

## Suites

### `getNonce` — 3 tests

`getNonce()` generates a 32-character random alphanumeric string used as a Content Security Policy nonce in webview HTML.

| Test | What is verified |
|---|---|
| returns a 32-character string | `length === 32` |
| contains only alphanumeric characters | matches `/^[A-Za-z0-9]{32}$/` |
| each call returns a different value | two consecutive calls produce different strings |

---

### `parseFrontmatterBlockLocal` — 6 tests

`parseFrontmatterBlockLocal(content)` extracts the raw YAML between the opening and closing `---` delimiters of a Markdown file. Returns `{ raw, fullMatchLen }` on success or `null` if no valid block is found.

| Test | What is verified |
|---|---|
| returns null when there is no frontmatter | plain Markdown with no `---` block → `null` |
| returns null for an unclosed frontmatter block | opening `---` with no closing `---` → `null` |
| parses a simple frontmatter block | `raw` contains the YAML lines without the delimiters |
| fullMatchLen equals the byte length including delimiters | `content.slice(0, fullMatchLen)` covers exactly the `---…---\n` block |
| handles multi-line frontmatter | multiple YAML keys are all present in `raw` |
| handles Windows CRLF line endings | `\r\n` separators are accepted and stripped correctly |

---

### `parseMetadataBlockLocal` — 8 tests

`parseMetadataBlockLocal(rawFrontmatter)` locates the `metadata:` key in raw frontmatter YAML and returns one of four values:

- `null` — no `metadata:` key found
- `"scalar"` — `metadata:` has an inline value (e.g. `metadata: foo`)
- `"list"` — the block's direct children are YAML list items (`- item`); lists nested deeper, under a sub-key, are values of the map
- `Record<string, string>` — a map of sub-key → value

| Test | What is verified |
|---|---|
| returns null when no metadata key is present | frontmatter without `metadata:` → `null` |
| returns scalar when metadata has an inline value | `metadata: something` → `"scalar"` |
| returns list when metadata contains a YAML list | `metadata:\n  - item` → `"list"` |
| returns list for a sequence at the key indentation | `metadata:\n- item` → `"list"` |
| treats nested lists inside the map as values, not as a list | sf-skills layout (`relatedSkills:` / `cliTools:` lists under the map) → Record with `version`, nested keys ignored |
| returns a Record with parsed sub-keys | `version` and `author` keys are extracted correctly |
| strips surrounding quotes from values | `"1.0"` and `'1.0'` are both returned as `1.0` |
| stops reading at the next top-level key | keys after the indented metadata block are not included |

---

### `parseSkillMdContent` — 5 tests

`parseSkillMdContent(content)` combines `parseFrontmatterBlockLocal` with a line-by-line YAML key parser to return `{ rawFrontmatter, frontmatter, body }`. `frontmatter` is a flat `Record<string, string>` of top-level keys; `body` is everything after the closing `---`.

| Test | What is verified |
|---|---|
| returns null frontmatter when there is no `---` block | `rawFrontmatter` and `frontmatter` are both `null`; `body` is the full content |
| correctly splits frontmatter from body | `frontmatter.name` is populated; `body` contains the text after `---` |
| strips quotes from frontmatter values | single- and double-quoted values are unquoted |
| body does not contain frontmatter content | frontmatter lines do not leak into the body |
| handles empty body after frontmatter | closing `---` with nothing after it gives an empty `body` |

---

### `validateSkillLocal` — 12 tests

`validateSkillLocal(skillName, dirPath)` runs the full [agentskills.io](https://agentskills.io) spec check against a locally installed skill directory. It returns `{ errors: string[], warnings: string[] }`.

Each test creates a real temporary directory with `fs.mkdtempSync`, writes a `SKILL.md`, calls `validateSkillLocal`, then asserts on the presence of specific error or warning messages. The temporary directory is deleted in `teardown`.

| Test | Scenario | Expected outcome |
|---|---|---|
| errors when the directory does not exist | path points to a non-existent dir | `errors` contains "not found" |
| errors when SKILL.md is missing | directory exists but has no `SKILL.md` | `errors` contains "SKILL.md not found" |
| passes a fully valid skill | gerund name, ≥20-word double-quoted description, metadata with `version: "1.0"`, non-empty body | `errors` is empty |
| errors when name field mismatches directory name | `name: "wrong-name"` in a dir called `generating-apex-tests` | `errors` contains "does not match directory name" |
| errors when frontmatter is missing entirely | plain Markdown with no `---` block | `errors` contains "missing or malformed YAML frontmatter" |
| errors when name is not kebab-case | directory and `name` field use `PascalCase` | `errors` contains "kebab-case" |
| errors when name is longer than 64 characters | 65-character name | `errors` contains "maximum 64" |
| warns when description is fewer than 20 words | description has fewer than 20 words | `warnings` contains "too short" |
| errors when description is not double-quoted | description value has no surrounding quotes | `errors` contains "double quotes" |
| errors when metadata block is missing | frontmatter has no `metadata:` key | `errors` contains `"metadata:" block` |
| errors when version is malformed | `version: "v1"` (not `x.y` format) | `errors` contains "x.y format" |
| errors when body is empty | only whitespace after the closing `---` | `errors` contains "body" and "empty" |
| warns when body exceeds 500 lines | body has 502 lines | `warnings` contains "500" |
| errors when metadata is an inline scalar | `metadata: some-value` (not a map) | `errors` contains "not an inline scalar" |

---

### `getTemplate` — 8 tests

`getTemplate(type, name)` returns a pre-filled Markdown or JSON template string for a new Copilot file. Each test asserts that the output contains key structural markers expected by the corresponding file format.

| Test | Template type | What is verified |
|---|---|---|
| copilot-instructions template starts with a heading | `copilot-instructions` | starts with `# Copilot Instructions` |
| instructions template includes the name and applyTo frontmatter | `instructions` | contains `applyTo:` and the supplied `name` |
| prompt template includes mode and description frontmatter | `prompt` | contains `mode:` and the supplied `name` |
| agent template includes name, description, and tools frontmatter | `agent` | contains `tools:` and the supplied `name` |
| personal-skill template includes name and description frontmatter | `personal-skill` | contains `description:` and the supplied `name` |
| hook template is valid JSON | `hook` | `JSON.parse()` succeeds and returns an object |
| agents-md template includes an AGENTS.md heading | `agents-md` | lowercased output contains `agent` |
| unknown type returns an empty string or non-null string | any unrecognised type | return type is `string` (empty string `""`) |

---

### `getCheckDescription` — 14 tests

`getCheckDescription(check)` maps a `CheckResult.id` to a human-readable explanation shown in the Summary panel. The function uses `startsWith` and exact-match comparisons against well-known ID prefixes.

| Test | ID (or prefix) | What is verified |
|---|---|---|
| github-instructions returns a non-empty description | `github-instructions` | description is non-empty and mentions "copilot" or "instruction" |
| root-instructions returns a non-empty description | `root-instructions` | description is non-empty |
| instr-* prefix returns scoped instructions description | `instr-my-file` | mentions "scoped" or "instruction" |
| skill-personal-* prefix returns personal skill description | `skill-personal-foo` | mentions "personal" |
| skill-* prefix returns workspace skill description | `skill-foo` | mentions "skill" or "workspace" |
| prompt-* prefix returns prompt description | `prompt-bar` | mentions "prompt" |
| agent-* prefix returns agent description | `agent-baz` | mentions "agent" |
| agents-md ok returns registry description | `agents-md` (status `ok`) | mentions "agent" |
| agents-md missing returns optional description | `agents-md` (status `missing`) | mentions "optional" or "not present" |
| copilot-ext returns extension description | `copilot-ext` | mentions "copilot" |
| copilot-chat-ext returns chat extension description | `copilot-chat-ext` | mentions "chat" or "copilot" |
| copilot-hook-* returns hook description | `copilot-hook-events` | mentions "hook" or "lifecycle" |
| workspace-settings returns settings description | `workspace-settings` | mentions "settings" |
| unknown id returns an empty string | `completely-unknown-id-xyz` | returns `""` |

---

### `deleteTargetFor` — 3 tests

`deleteTargetFor(filePath)` returns what the Checks-tab **delete** button removes: the whole skill folder for a `SKILL.md` inside a `skills/{name}/` folder, the file itself otherwise.

| Test | What is verified |
|---|---|
| a skill SKILL.md resolves to its whole skill folder | `ws/.github/skills/platform-apex-generate/SKILL.md` → `ws/.github/skills/platform-apex-generate` |
| a personal skill SKILL.md resolves to its skill folder | `~/.copilot/skills/my-skill/SKILL.md` → `~/.copilot/skills/my-skill` |
| other files are deleted on their own | an `.instructions.md` file and a `SKILL.md` outside a `skills/` folder are returned unchanged |

---

### `CATEGORY_HELP` — 8 tests

`CATEGORY_HELP` holds the content of the **Help** popup shown next to each Checks-tab category header.

| Test | What is verified |
|---|---|
| covers every Checks-tab category | keys are exactly Instructions, Skills, Prompts, Agents, Copilot Hooks, Extensions, Settings |
| `{category}`: has a summary and the required sections with content (×7) | non-empty summary; sections "When it is triggered", "Format", "Location", "Common use" and "What this tab checks" are present; no section is empty |

---

### Initialize Project Configuration — 5 tests

Covers `readSfdxProjectInfo`, `getProjectInitFiles`, `previewProjectInit` and `createProjectInitFiles`, behind the Workspace tab's **Initialize Project Configuration** button. Uses a temp directory per test.

| Test | What is verified |
|---|---|
| readSfdxProjectInfo reads the API version and the default package directory | `sourceApiVersion` and the `default: true` package directory (trailing `/` removed) |
| readSfdxProjectInfo reports a non-SFDX folder | no `sfdx-project.json` → `{ isSfdxProject: false }` |
| files have unique relative paths, no skills, and the project values | no duplicate, absolute, `..` or `\` paths; nothing under `/skills/`; API version and package directory written into `AGENTS.md` and the trigger prompt; `${input:…}` variables kept |
| JSON files parse and the hook points to generated scripts | `guard.json`, `mcp.json`, `extensions.json` parse; both hook commands reference scripts that are generated; MCP uses `DEFAULT_TARGET_ORG` |
| preview flags existing files; create never overwrites and ignores unknown paths | an existing `AGENTS.md` is reported and left untouched; only selected files are created; `../outside.txt` is ignored |

---

## Design notes

- **No VS Code API in tests** — all tested functions are pure utilities that operate only on strings and the filesystem. The `vscode` module is available in the test host but none of these functions call it.
- **Real filesystem for skill validation** — `validateSkillLocal` reads files with `fs.readFileSync`, so tests use actual temp directories rather than mocks. This catches path-handling and encoding bugs that in-memory stubs would miss.
- **Teardown guarantees cleanup** — the `teardown` hook in the `validateSkillLocal` suite calls `fs.rmSync(tmpDir, { recursive: true, force: true })` after each test so temp directories never accumulate.
- **Assertion style** — tests use Node's built-in `assert` module (`assert.ok`, `assert.strictEqual`, `assert.deepStrictEqual`, `assert.match`, `assert.doesNotThrow`) to keep the dependency surface minimal.
