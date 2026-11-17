# Best Practices — configuring GitHub Copilot for a Salesforce DX project

This page proposes a complete, commented Copilot configuration for a Salesforce DX project: **what file goes where, why, and what it contains**. Every file below is a working starting point to copy and adapt.

**Shortcut:** in the Inspector, *Workspace* tab → **Initialize Project Configuration** creates these files in one go. It shows which files already exist (never overwritten) before you click Create.

It assumes you know [when each kind of file is triggered](RULES_AND_ORDERS.md). Skills are not written by hand here: install them from the **Salesforce Skills Library** in the Inspector (forcedotcom/sf-skills).

> **Version note.** Written for VS Code with GitHub Copilot Chat in agent mode, late 2026. Tool names in `tools:` lists, hook event names and some `chat.*` settings change between versions. They are marked *(check your version)* where it matters. Use the Inspector's Checks tab and the Chat **Diagnostics** view to confirm that each file is picked up.

---

## 1. Principles

1. **One fact, one place.** A rule written in three files drifts into three different rules. Each section below says which file owns which kind of fact.
2. **Always-on context is expensive.** `AGENTS.md` and `copilot-instructions.md` are sent with every request. Keep them short (under about 150 lines together) and move the rest into scoped files.
3. **Scope by glob, not by hope.** Rules for Apex, LWC or Flows go into `*.instructions.md` files with `applyTo`, so they are sent only when such a file is in context.
4. **Procedures are skills.** "How to write a test class", "how to analyse a debug log" are step-by-step procedures that are only sometimes needed. They belong in skills, loaded on demand.
5. **What must always happen is a hook or CI, never a sentence.** "Never deploy to production" written in instructions is a wish; a pre-tool hook that blocks the command is a guarantee.
6. **Least privilege.** Read-only agents for review, MCP limited to the default (non-production) org and to the toolsets the team uses.
7. **Shared in Git, personal in the profile.** Team rules are committed. Personal preferences (tone, language, your own shortcuts) go in your user profile, never in the repository.
8. **Measure, then prune.** Use the Inspector's Usage panel to find skills nobody uses and remove them; every unused skill still costs a line in each request's skills list.

---

## 2. Recommended layout

```text
my-salesforce-project/
├── AGENTS.md                                  ← project facts + commands, read by every coding agent
├── CLAUDE.md                                  ← one line: @AGENTS.md (only if the team also uses Claude Code)
├── .github/
│   ├── copilot-instructions.md                ← Copilot-only behaviour (short)
│   ├── instructions/
│   │   ├── apex.instructions.md               ← applyTo: **/*.cls, **/*.trigger
│   │   ├── apex-tests.instructions.md         ← applyTo: **/*Test.cls
│   │   ├── lwc.instructions.md                ← applyTo: **/lwc/**
│   │   └── metadata.instructions.md           ← applyTo: **/*-meta.xml
│   ├── prompts/
│   │   ├── new-trigger.prompt.md
│   │   ├── new-lwc.prompt.md
│   │   └── release-notes.prompt.md
│   ├── agents/
│   │   ├── sf-planner.agent.md                ← read-only, hands off to implementation
│   │   └── apex-reviewer.agent.md             ← read-only review
│   ├── skills/                                ← installed from the Salesforce Skills Library
│   │   ├── platform-apex-generate/
│   │   ├── platform-apex-test-generate/
│   │   ├── platform-apex-test-run/
│   │   └── platform-apex-logs-debug/
│   ├── hooks/
│   │   ├── guard.json
│   │   └── scripts/
│   │       ├── block-prod-deploy.sh
│   │       └── block-prod-deploy.ps1
│   └── workflows/
│       └── copilot-setup-steps.yml            ← environment of the cloud coding agent
├── .vscode/
│   ├── settings.json
│   ├── extensions.json
│   └── mcp.json                               ← Salesforce DX MCP server
├── .forceignore                               ← keeps AI files out of deployments
├── force-app/main/default/…
└── sfdx-project.json
```

### Who owns what

| Fact | Owner file | Not in |
|---|---|---|
| Org shape, namespace, API version, folder structure | `AGENTS.md` | instructions, agents |
| Build, test, lint, deploy commands | `AGENTS.md` | prompts (link to it instead) |
| How Copilot should answer, review focus | `.github/copilot-instructions.md` | `AGENTS.md` (other agents don't need it) |
| Apex / LWC / metadata coding rules | `.github/instructions/*.instructions.md` | `AGENTS.md` |
| Step-by-step procedures with templates | Skills | instructions |
| Repeated requests you start yourself | Prompts | skills |
| Roles with restricted tools | Custom agents | prompts |
| Things that must never / always happen | Hooks + CI | any Markdown file |
| Tools that reach the org | `.vscode/mcp.json` | — |
| Editor and Copilot switches | `.vscode/settings.json` | — |

---

## 3. `AGENTS.md` — the project guide for every agent

`AGENTS.md` is an open format read by GitHub Copilot (VS Code and the cloud coding agent), Codex, Cursor and many other agents. Use it for **facts and commands**: things that are true no matter which agent or which file is being edited.

### Example: root `AGENTS.md`

````markdown
# AGENTS.md

## Project
- Salesforce DX project for the Sales Cloud customisation of ACME.
- API version 63.0. No namespace. Source format, single package directory: `force-app/`.
- Orgs: scratch orgs for development, `acme-uat` sandbox for UAT. Production is deployed by CI only.

## Structure
- `force-app/main/default/classes/` — Apex. Layers: `*Selector` (SOQL), `*Service` (logic), `*Domain` (sObject rules), `*Controller` (LWC/Aura entry points).
- `force-app/main/default/triggers/` — one trigger per object, logic in `*TriggerHandler`.
- `force-app/main/default/lwc/` — Lightning Web Components, Jest tests in `__tests__/`.
- `scripts/apex/` — anonymous Apex for data setup. `config/` — scratch org definitions.

## Commands
- Install: `npm ci`
- Create a scratch org: `sf org create scratch -f config/project-scratch-def.json -a dev -d`
- Deploy to the default org: `sf project deploy start -d force-app`
- Apex tests: `sf apex run test -l RunLocalTests -w 20 -r human`
- LWC tests: `npm run test:unit`
- Lint: `npm run lint` · Format: `npm run prettier`
- Static analysis: `sf code-analyzer run --workspace force-app`

## Rules for any change
- Run the Apex tests of the classes you changed and `npm run test:unit` for LWC before saying a task is done.
- Never deploy to production or run destructive changes; CI does it.
- Never commit credentials, auth URLs or org usernames.
- Keep each change small: one feature or fix per pull request.
````

Around 40 lines: enough for an agent to work alone, short enough to be sent with every request.

### Is "a global `AGENTS.md` plus nested ones in sub-folders" a good practice?

The idea you found:

> *Modularity: if your project is large, you can put a global `AGENTS.md` at the root and more specific `AGENTS.md` files in sub-folders (for example `force-app/main/default/lwc/AGENTS.md` only for front-end rules).*

**Verdict: valid in principle, but not the best choice for Copilot in VS Code on a Salesforce project.** Prefer a scoped instructions file.

| | Nested `lwc/AGENTS.md` | `.github/instructions/lwc.instructions.md` with `applyTo: "**/lwc/**"` |
|---|---|---|
| Copilot in VS Code | Only with nested `AGENTS.md` support enabled (experimental setting in many versions, *check your version*) | Supported by default |
| Copilot cloud coding agent | Supported (closest `AGENTS.md` applies) | Supported |
| Codex, Cursor and other agents | Supported | Not read |
| When it applies | Depends on the agent: usually when working in that folder | Whenever an LWC file is in context, wherever it is |
| Salesforce deployment | `lwc/AGENTS.md` sits in a metadata folder: add it to `.forceignore` | Outside `force-app`, nothing to do |
| Found by reviewers | Scattered in the source tree | All rules in one folder |

**Recommendation**

- **Copilot is the main agent:** one root `AGENTS.md` for facts and commands, and **scoped `*.instructions.md` files** for Apex, LWC and metadata rules. This is the layout used on this page.
- **Several agents (Copilot + Codex/Cursor):** nested `AGENTS.md` files are useful **for sub-projects with their own tooling**, not for coding style. Good examples: a Node tool in `tools/data-loader/` with its own `npm` commands, or a separate package directory in a multi-package project. In that case:
  - keep each nested file under about 20 lines;
  - never copy root content into it;
  - add `**/AGENTS.md` to `.forceignore` if one lives inside `force-app`.
- **Do not put the same LWC rules in both** `lwc/AGENTS.md` and `lwc.instructions.md`: Copilot would receive them twice, and they will drift apart.

### Claude Code

Claude Code reads `CLAUDE.md`, not `AGENTS.md`. To keep one source of truth, `CLAUDE.md` contains a single import line:

```markdown
@AGENTS.md
```

---

## 4. `.github/copilot-instructions.md` — Copilot-specific behaviour

Facts are already in `AGENTS.md`. This file only says **how Copilot should behave**, including in pull-request reviews (Copilot code review reads it too).

```markdown
# Copilot instructions

- Project facts and commands are in AGENTS.md; follow them.
- Answer in English, concisely. Show code first, explanation after.
- Before writing Apex, check whether a Selector or Service already exists for the object and reuse it.
- When a request is ambiguous about the target org, ask; never assume production.
- In code reviews, focus on: governor limits (SOQL/DML in loops, unbounded queries), sharing and CRUD/FLS,
  test quality (assertions, bulk tests with 200 records), and hard-coded IDs or URLs.
  Do not comment on formatting: Prettier handles it.
```

---

## 5. Scoped instructions — coding rules by file type

### `apex.instructions.md`

```markdown
---
applyTo: "**/*.cls,**/*.trigger"
description: Apex coding standards
---
- Classes are `with sharing` unless a comment explains why `without sharing` or `inherited sharing` is needed.
- Bulkify everything: no SOQL or DML inside loops; collect IDs, query once, update once.
- SOQL lives in `*Selector` classes, uses bind variables and `WITH USER_MODE` (or `Security.stripInaccessible`).
- DML uses `Database.*` with `AccessLevel.USER_MODE` when called from user context.
- One trigger per object; the trigger only calls `<Object>TriggerHandler`.
- No hard-coded record IDs, profile names or URLs: use Custom Metadata or Custom Labels.
- Throw custom exceptions (`<Feature>Exception`) instead of returning null for errors.
- Public methods called from LWC are `@AuraEnabled(cacheable=true)` only when they do not modify data.
```

### `apex-tests.instructions.md`

```markdown
---
applyTo: "**/*Test.cls,**/*_Test.cls"
description: Apex test standards
---
- Use `TestDataFactory` for records; never `SeeAllData=true`.
- Each test method follows Arrange / Act / Assert, with `Test.startTest()` / `Test.stopTest()` around Act.
- Every test asserts with `Assert.areEqual` / `Assert.isTrue` and a message. A test without assertions is a bug.
- Include a bulk test (200 records) for every trigger handler and batch.
- Test negative paths and a user without permissions (`System.runAs`).
```

### `lwc.instructions.md`

```markdown
---
applyTo: "**/lwc/**"
description: Lightning Web Components standards
---
- Use SLDS classes and design tokens; no hard-coded colours or pixel sizes.
- Read data with `@wire` and Lightning Data Service (`lightning/uiRecordApi`) before writing Apex.
- Call imperative Apex only for writes or for queries that cannot be wired; handle errors with a toast.
- Every component has Jest tests in `__tests__/`, mocking wire adapters and Apex.
- Text visible to users comes from Custom Labels (`@salesforce/label/...`).
- Components are accessible: labels on inputs, keyboard navigation, `alternative-text` on icons.
```

### `metadata.instructions.md`

```markdown
---
applyTo: "**/*-meta.xml"
description: Metadata XML rules
---
- Keep the API version of new metadata equal to `sourceApiVersion` in sfdx-project.json.
- Never grant "Modify All Data" or "View All Data" in permission sets; one permission set per feature.
- Record-triggered Flows: before-save for field updates on the same record, after-save for related records;
  every Flow has a fault path.
- Do not edit `*.profile-meta.xml`; use permission sets.
```

---

## 6. Skills — install, don't rewrite

Install the skills from the Inspector's **Salesforce Skills Library** into `.github/skills/` so the whole team shares them. A good starting set for an Apex project:

| Skill | Covers |
|---|---|
| `platform-apex-generate` | Apex classes from templates (selector, service, batch, queueable…) |
| `platform-apex-test-generate` | Test classes and data factories |
| `platform-apex-test-run` | Running tests and reading coverage |
| `platform-apex-logs-debug` | Debug log analysis, governor-limit fixes |

**Practices**

- **Don't copy skill content into instructions.** Instructions say *what is allowed*; skills say *how to do a task*. The Apex instructions above are short on purpose: the generation skills bring their own templates.
- **Adapt the description, not the procedure.** If a skill is not picked, add the words your team actually types ("unit test", "coverage", "test class") to its `description`. Then **check** it again in the Inspector.
- **Keep the list short.** Every installed skill adds its name and description to each request. Use the Usage panel after a few weeks and remove skills nobody uses.
- **Pin versions.** Skills carry `metadata.version`. Review upstream changes before reinstalling.

---

## 7. Prompts — repeated requests

### `new-trigger.prompt.md`

```markdown
---
description: Create a trigger, its handler and tests for an sObject
agent: agent
argument-hint: sObject API name, e.g. Opportunity
---
Create the trigger framework for ${input:sobject:sObject API name}:

1. `force-app/main/default/triggers/${input:sobject}Trigger.trigger` — calls the handler only.
2. `${input:sobject}TriggerHandler.cls` following the Apex instructions.
3. A test class with a bulk test of 200 records.

Then run the new tests with the command from AGENTS.md and report the result.
```

### `new-lwc.prompt.md`

```markdown
---
description: Scaffold a Lightning Web Component with Jest tests
agent: agent
argument-hint: component name in camelCase
---
Create the LWC `${input:name}` in `force-app/main/default/lwc/` with HTML, JS, meta XML
(target lightning__RecordPage) and a Jest test in `__tests__/`.
Follow the LWC instructions. Run `npm run test:unit -- ${input:name}` and fix failures.
```

### `release-notes.prompt.md`

```markdown
---
description: Draft release notes from the changes on this branch
agent: ask
---
Summarise the changes on this branch compared with `main` for business users:
new features, fixes, and manual post-deployment steps (permission sets to assign, data to load).
Group by feature, one line each, no code.
```

---

## 8. Custom agents — roles with limited tools

Tool names below are those shown in the *Configure Tools* picker; they change between versions *(check your version)*. `Salesforce DX/*` means "all tools of the MCP server named Salesforce DX".

### `sf-planner.agent.md` — plan first, then hand off

```markdown
---
description: Plans a Salesforce change (objects, Apex, LWC, permissions) without editing files
tools: ['search', 'usages', 'problems', 'fetch', 'Salesforce DX/*']
handoffs:
  - label: Implement the plan
    agent: agent
    prompt: Implement the plan above, step by step, running tests after each step.
    send: false
---
You are a Salesforce technical architect. Do not edit files.

For each request, produce a plan with:
1. Metadata to create or change (objects, fields, permission sets, Flows).
2. Apex and LWC changes, reusing existing Selectors and Services.
3. Tests to add and how to run them (commands from AGENTS.md).
4. Risks: governor limits, sharing, data migration, deployment order.

Use the Salesforce DX tools only to read org metadata; never deploy or change data.
```

### `apex-reviewer.agent.md` — read-only review

```markdown
---
description: Reviews Apex and LWC for limits, security and test quality; never edits
tools: ['search', 'usages', 'problems', 'changes']
---
You review code; you never change it.

Report findings as a table: file:line, severity (blocker / major / minor), issue, suggested fix.
Check in this order: SOQL/DML in loops, missing sharing or CRUD/FLS, hard-coded IDs, missing or weak
test assertions, error handling, naming. Say "No issues found" when that is the case.
```

**Agent or skill?** These two are agents because they **restrict tools** and **last the whole conversation**. A procedure such as "generate a test class" is a skill. See [Agent vs Skill](RULES_AND_ORDERS.md#5-agent-vs-skill--why-they-look-alike-and-how-they-differ).

---

## 9. Hooks — what must always or never happen

### `.github/hooks/guard.json`

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "bash .github/hooks/scripts/block-prod-deploy.sh",
        "powershell": "powershell -NoProfile -ExecutionPolicy Bypass -File .github/hooks/scripts/block-prod-deploy.ps1",
        "timeoutSec": 10
      }
    ]
  }
}
```

Calling the script through `bash` / `powershell -File` avoids depending on the executable bit (lost on Windows checkouts) and on the PowerShell execution policy.

### `block-prod-deploy.sh`

The hook receives the tool call as JSON on standard input. It searches that raw text, so it needs no `jq` and works whatever the field names are. It denies Salesforce CLI deploys, data deletes, org deletes and destructive changes that **name no target org** or target a **protected org**. The exact output that denies a call depends on the hook format *(check your version)*. The PowerShell twin applies the same rules.

```bash
#!/usr/bin/env bash
PROTECTED_ORGS='prod|production'

input=$(cat)

# Only deploy and delete commands are checked; everything else is allowed.
if ! printf '%s' "$input" | grep -Eq 'sf (project deploy (start|quick|resume)|data delete|org delete)|destructiveChanges'; then
  exit 0
fi

target=$(printf '%s' "$input" | grep -Eo -- '(-o|--target-org)[ =]+[^ "\\]+' | head -n 1 | sed -E 's/^(-o|--target-org)[ =]+//')

if [ -z "$target" ]; then
  reason='Deploy and delete commands must name their target org (--target-org).'
elif printf '%s' "$target" | grep -Eiq "^($PROTECTED_ORGS)$"; then
  reason="Org $target is protected: production changes go through CI."
else
  exit 0
fi

printf '{"permissionDecision":"deny","permissionDecisionReason":"%s"}\n' "$reason"
```

| Command | Result |
|---|---|
| `sf project deploy start -d force-app -o prod` | denied (protected org) |
| `sf project deploy start -d force-app` | denied (no target org) |
| `sf project deploy start --target-org dev` | allowed |
| `sf apex run test -o prod` | allowed (not a deploy or delete) |

A formatting hook (`postToolUse` running Prettier on edited files) is a good addition when every developer has the same Prettier setup. It is not generated by the Inspector, because formatters differ between projects.

**Practices**

- Hooks run with **your** permissions: review hook changes like production code (put `.github/hooks/` in `CODEOWNERS`).
- Keep them fast; they run on every tool call.
- Hooks are not a replacement for CI: Apex tests and Code Analyzer still run in the pipeline.
- This hook only inspects shell commands. Deploys made through MCP tools are a different tool call (see §10).

---

## 10. MCP — the Salesforce DX server

### `.vscode/mcp.json`

```json
{
  "servers": {
    "Salesforce DX": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", "@salesforce/mcp",
        "--orgs", "DEFAULT_TARGET_ORG",
        "--toolsets", "sobjects,data,testing,code-analysis,lwc-experts"
      ]
    }
  }
}
```

**Practices**

- **`--orgs DEFAULT_TARGET_ORG` in committed files**, not a username. Each developer's default org (`sf config set target-org …`) is then used. Org usernames don't belong in Git, and nobody's default should be production. The Inspector's MCP tab writes the username it detects: replace it with `DEFAULT_TARGET_ORG` before committing. Never use `ALLOW_ALL_ORGS` in a shared file.
- **Enable only the toolsets you use.** Every tool adds to the request and widens what the agent can do. `core` is always on. Use the names your server version lists (the Inspector's **⟳ from server** shows them).
- **Think twice about `deploy-retrieve`.** Its deploy tool is an MCP tool call, not a shell command, so the `block-prod-deploy` hook above (which checks shell commands) does not see it. Without that toolset, deploys go through `sf project deploy` in the terminal, where the hook applies. If you enable it, rely on `DEFAULT_TARGET_ORG` pointing to a non-production org, and extend the hook to MCP tool names.
- **No `--allow-non-ga-tools` in shared config.** Pilot and beta tools belong in a personal configuration.
- **Pin the version** (`@salesforce/mcp@x.y.z`) when the team needs reproducible behaviour; leave it unpinned to follow updates.
- **Claude Code** uses `.mcp.json` at the root with the same arguments under `mcpServers`. The Inspector can write both.
- **Node.js ≥ 20.19 or ≥ 22.12** is required by `@salesforce/mcp`.

---

## 11. Settings and recommended extensions

### `.vscode/settings.json`

```jsonc
{
  // Copilot customisation files
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,
  "chat.useAgentsMdFile": true,
  "chat.instructionsFilesLocations": { ".github/instructions": true },
  "chat.promptFilesLocations": { ".github/prompts": true },

  // Inline suggestions: on for code, off for files where they only add noise
  "github.copilot.enable": { "*": true, "plaintext": false, "markdown": false },

  // Formatting (Apex needs prettier-plugin-apex in devDependencies)
  "editor.formatOnSave": true,
  "[apex]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

Leave **auto-approval of terminal commands** (`chat.tools.*autoApprove*`, *check your version*) out of shared settings. Each developer decides what runs without confirmation.

### `.vscode/extensions.json`

```json
{
  "recommendations": [
    "salesforce.salesforcedx-vscode",
    "github.copilot-chat",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

---

## 12. The cloud coding agent

When an issue is assigned to Copilot on GitHub, the coding agent works in a GitHub Actions environment. It reads `AGENTS.md` and `copilot-instructions.md`, but it needs the tools installed there too.

### `.github/workflows/copilot-setup-steps.yml`

```yaml
name: Copilot setup steps
on: workflow_dispatch
jobs:
  copilot-setup-steps:        # this job name is required
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm install --global @salesforce/cli
      # Optional: a Dev Hub to create scratch orgs. Store the auth URL in the "copilot" environment secrets.
      # - run: echo "${{ secrets.DEVHUB_SFDX_AUTH_URL }}" | sf org login sfdx-url --sfdx-url-stdin --set-default-dev-hub
```

**Practices**

- Give the coding agent a **Dev Hub to create scratch orgs**, never a sandbox or production login.
- Instructions files can exclude an agent with `excludeAgent: "code-review"` or `"coding-agent"` in their frontmatter *(check your version)*. Use it for rules that only make sense in the editor.
- Branch protection and required CI checks apply to the agent's pull requests, like to anyone else's.

---

## 13. `.forceignore` and `.gitignore`

AI configuration must never be deployed to an org.

```text
# .forceignore — additions
**/AGENTS.md
**/CLAUDE.md
**/*.instructions.md
**/__tests__/**
**/jsconfig.json
**/.eslintrc.json
```

```text
# .gitignore — additions
.claude/settings.local.json
.hooks.log
.sf/
.sfdx/
```

---

## 14. Anti-patterns

| Anti-pattern | Why it hurts | Instead |
|---|---|---|
| A 600-line `copilot-instructions.md` | Sent with every request; the model weighs each rule less | Root files under about 150 lines, the rest scoped |
| The same rule in `AGENTS.md`, instructions and a skill | Three copies drift; contradictions confuse the model | One owner per fact (§2) |
| "Never deploy to prod" as an instruction only | Not guaranteed | Pre-tool hook + CI |
| `applyTo: "**"` on language rules | Apex rules sent while editing LWC | One glob per file type |
| A custom agent for every task | Agents are roles, not procedures | Skills for procedures, prompts for requests |
| `--orgs` with a personal username or `ALLOW_ALL_ORGS` in Git | Leaks usernames; can reach production | `DEFAULT_TARGET_ORG` |
| All MCP toolsets and non-GA tools enabled | Larger requests, more risk | Only the toolsets you use |
| Skills installed "just in case" | Each one is listed in every request | Prune with the Usage panel |
| Personal preferences in the repository | Imposed on the whole team | User profile files (Inspector → Personal tab) |

---

## 15. Keeping it healthy

- **Ownership:** add `.github/instructions/`, `.github/agents/`, `.github/hooks/`, `AGENTS.md` and `.vscode/mcp.json` to `CODEOWNERS`. A change to them changes how every developer's agent behaves.
- **Review each quarter:** remove outdated rules, update the API version in `AGENTS.md`, reinstall reviewed skill versions.
- **Check with the Inspector:**
  - **Checks** tab after each change;
  - **check** on every skill;
  - **MCP** tab after upgrading `@salesforce/mcp`;
  - **Usage** panel to see which skills are really used.
- **Test new rules on real prompts**, with the verification methods in [Rules and Orders §7](RULES_AND_ORDERS.md#7-how-to-verify-what-was-triggered).
