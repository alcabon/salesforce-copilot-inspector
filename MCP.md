# MCP — Model Context Protocol

## Table of Contents

0. [Quick Start — Salesforce MCP in 3 steps](#0-quick-start--salesforce-mcp-in-3-steps)
1. [What is MCP?](#1-what-is-mcp)
2. [MCP in VS Code — the "Add Server" menu](#2-mcp-in-vs-code--the-add-server-menu)
3. [Config file locations and scopes](#3-config-file-locations-and-scopes)
4. [Server types in detail](#4-server-types-in-detail)
5. [Salesforce DX MCP Server](#5-salesforce-dx-mcp-server)
6. [This workspace configuration](#6-this-workspace-configuration)
7. [Managing servers from the extension](#7-managing-servers-from-the-extension)
8. [Troubleshooting](#8-troubleshooting)

---

## 0. Quick Start — Salesforce MCP in 3 steps

### Prerequisites

| Requirement | Check | Install |
|---|---|---|
| Node.js ≥ 20.19.0 or ≥ 22.12.0 | `node --version` | [nodejs.org](https://nodejs.org) — v20.18.x and earlier are **not supported** by `@salesforce/mcp` |
| Salesforce CLI | `sf --version` | `npm install -g @salesforce/cli` |
| Authenticated org | `sf org display` | `sf org login web --alias myorg` |

`npx` comes bundled with Node.js — no separate install needed. `@salesforce/mcp` is fetched on first run by `npx -y`.

---

### Step 1 — Authenticate a Salesforce org

```bash
sf org login web --alias myorg        # browser-based OAuth
# or
sf org login jwt --alias myorg \      # CI / headless
  --client-id $CLIENT_ID \
  --jwt-key-file server.key \
  --username user@org.com

sf org display                        # confirm: shows Status = Connected
```

---

### Step 2 — Add the MCP server to VS Code

Three equivalent paths — pick one:

#### Path A — Edit `.vscode/mcp.json` directly (fastest)

Create or open `.vscode/mcp.json` in the workspace root and paste:

```json
{
  "servers": {
    "Salesforce DX": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp",
        "--orgs",     "user@org.com",
        "--toolsets", "core,apex,deploy-retrieve"
      ]
    }
  }
}
```

Replace `user@org.com` with the output of `sf org display --json | jq .result.username`.

#### Path B — VS Code "Add Server" UI (guided)

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **MCP: Add Server**
3. Choose **NPM Package** (Model-Assisted)
4. Type `@salesforce/mcp` → `Enter`
5. Copilot Chat opens in the sidebar and **proposes the JSON config** — review and adjust `--orgs` and `--toolsets`
6. Confirm → VS Code writes `.vscode/mcp.json` for you

> **Does the prompt show a shell command?**
> No. The "Add Server" UI never shows a terminal command.
> - **Command (stdio)** opens the `.vscode/mcp.json` file for you to edit the JSON directly.
> - **NPM Package** opens Copilot Chat which proposes the JSON config as chat output — not a shell command.
> The config is always JSON, never a `npx …` command you run yourself.

#### Path C — This extension's MCP tab (visual selector)

1. Open the **Salesforce Github Copilot** sidebar (Activity Bar)
2. Switch to the **MCP** tab
3. Check the toolsets you need
4. Click **Install for Workspace (VS Code)** — the extension writes `.vscode/mcp.json` automatically

---

### Step 3 — Verify the server starts

In VS Code, open the **Output** panel (`Ctrl+Shift+U`) and select **GitHub Copilot — MCP** from the dropdown. You should see:

```
[Salesforce DX] Server started
[Salesforce DX] Discovered N tools
```

Then open GitHub Copilot Chat, type `@salesforce` and confirm the tools appear in the agent picker.

---

## 1. What is MCP?

The **Model Context Protocol** (MCP) is an open standard that lets AI agents (GitHub Copilot, Claude Code, etc.) call external tools, read resources, and query data sources through a uniform interface — without being retrained on that data.

```
AI Agent ──► MCP Client (built into VS Code / Claude Code)
                    │
                    ▼
             MCP Server (local process or remote HTTP)
                    │
                    ▼
         Tool / Resource / Data source
         (Salesforce org, filesystem, database, API …)
```

Each MCP server exposes:
- **Tools** — callable functions (e.g. `run_apex`, `deploy_metadata`)
- **Resources** — readable data sources (e.g. org schema)
- **Prompts** — reusable prompt templates

---

## 2. MCP in VS Code — the "Add Server" menu

Clicking **Add Server…** in the MCP section of VS Code settings opens a quick-pick with seven options. Each option corresponds to a different transport or packaging model for the server process.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Choose the type of MCP server to add                                    │
├──────────────────────────────────────────────────────────┬───────────────┤
│  Command (stdio)   Run a local command                   │ Manual Install│
│  HTTP (HTTP or SSE) Connect to a remote HTTP server      │               │
│  NPM Package       Install from an NPM package name      │ Model-Assisted│
│  Pip Package       Install from a Pip package name       │               │
│  Docker Image      Install from a Docker image           │               │
├──────────────────────────────────────────────────────────┴───────────────┤
│  Add from another application…                                           │
│  Browse MCP Servers…                                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

The **Manual Install** badge means VS Code writes the JSON config directly without contacting any registry.
The **Model-Assisted** badge means VS Code uses Copilot to infer the correct arguments from the package name.

---

## 3. Config file locations and scopes

VS Code resolves MCP server configuration from two places:

| File | Scope | Committed to repo? |
|---|---|---|
| `.vscode/mcp.json` | Workspace — all contributors share it | yes |
| `%APPDATA%\Code\User\settings.json` (Windows) / `~/.config/Code/User/settings.json` (Linux/Mac) — key `mcp.servers` | User — personal, all workspaces | no |

Workspace scope takes precedence. The `.vscode/mcp.json` file is the standard way to ship an MCP server configuration alongside your project.

> **Claude Code** uses a different file format:
> - `.mcp.json` (workspace root) — key `mcpServers`
> - `~/.claude/mcp.json` — personal scope

Both formats are detected and displayed by this extension's **MCP tab**.

---

## 4. Server types in detail

### 4.1 Command (stdio) — Manual Install

The most common type. VS Code launches a local process and communicates over **stdin / stdout**.

```json
// .vscode/mcp.json
{
  "servers": {
    "my-server": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "${input:apiKey}"
      }
    }
  }
}
```

`${input:variableName}` prompts the user for a value the first time the server starts.

Typical commands:

| Runtime | Command pattern |
|---|---|
| Node / npx | `"command": "npx", "args": ["-y", "@scope/package"]` |
| Python / uvx | `"command": "uvx", "args": ["package-name"]` |
| Python / pip | `"command": "python", "args": ["-m", "package_name"]` |
| Compiled binary | `"command": "/usr/local/bin/my-mcp-server"` |
| Docker | `"command": "docker", "args": ["run", "-i", "--rm", "image:tag"]` |

---

### 4.2 HTTP (HTTP or Server-Sent Events)

Connects to a **remote** or locally running HTTP server. Two sub-transports:

**Streamable HTTP** (preferred, MCP spec 2025-03-26+):

```json
{
  "servers": {
    "remote-server": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${input:token}"
      }
    }
  }
}
```

**Server-Sent Events (SSE)** (legacy transport):

```json
{
  "servers": {
    "sse-server": {
      "type": "sse",
      "url": "http://localhost:3000/sse"
    }
  }
}
```

Use HTTP/SSE when the server is:
- Hosted in the cloud or on a corporate server
- Shared across a team (one process, many clients)
- Written in any language with an HTTP stack

---

### 4.3 NPM Package — Model-Assisted

VS Code prompts for a **package name** only, then asks Copilot to infer the correct `command` and `args` from the package's README or metadata. The result is a standard `stdio` entry using `npx`:

```json
{
  "servers": {
    "@salesforce/mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@salesforce/mcp"]
    }
  }
}
```

The **Model-Assisted** badge indicates that argument inference (toolsets, orgs, flags) is suggested by Copilot — you can accept or edit the generated config.

---

### 4.4 Pip Package

Same flow as NPM but for Python packages. Uses `uvx` (preferred) or falls back to `python -m`:

```json
{
  "servers": {
    "my-python-mcp": {
      "type": "stdio",
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

Requires Python and `uv` (or `pip`) on the system `PATH`.

---

### 4.5 Docker Image

Runs an MCP server inside a Docker container. VS Code passes `-i` so stdin/stdout work across the container boundary:

```json
{
  "servers": {
    "containerized-mcp": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "API_KEY=${input:apiKey}",
        "ghcr.io/org/mcp-server:latest"
      ]
    }
  }
}
```

Useful for:
- Servers with complex native dependencies
- Isolated, reproducible environments
- Servers that need access to Docker networking

---

### 4.6 Add from another application…

Imports server entries already configured in a supported application (Claude Desktop, Claude Code, Cursor, etc.). VS Code reads the foreign config file, presents each server as a checkbox, and merges selected entries into `.vscode/mcp.json` or user settings.

---

### 4.7 Browse MCP Servers…

Opens the VS Code MCP server marketplace ([marketplace.visualstudio.com](https://marketplace.visualstudio.com)) filtered to MCP-tagged extensions and entries. Community-published servers can be installed from here with one click, which writes the correct `mcp.json` entry automatically.

---

## 5. Salesforce DX MCP Server

`@salesforce/mcp` is the official Salesforce MCP server. It exposes Salesforce CLI operations as tools callable by any MCP-capable agent.

### Installation (manual — VS Code)

```json
// .vscode/mcp.json
{
  "servers": {
    "Salesforce DX": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp",
        "--orgs",        "user@myorg.com",
        "--toolsets",    "core,apex,deploy-retrieve",
        "--allow-non-ga-tools"
      ]
    }
  }
}
```

### Installation (manual — Claude Code)

```json
// .mcp.json
{
  "mcpServers": {
    "Salesforce DX": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp",
        "--orgs",     "user@myorg.com",
        "--toolsets", "core,apex,deploy-retrieve"
      ]
    }
  }
}
```

### Key flags

| Flag | Required | Description |
|---|---|---|
| `--orgs` | yes | Comma-separated Salesforce org usernames or aliases |
| `--toolsets` | no | Comma-separated toolsets to expose (defaults to `core`) |
| `--tools` | no | Comma-separated individual tools (alternative to `--toolsets`) |
| `--allow-non-ga-tools` | no | Enable pilot / beta tools (not GA, use with care in production) |

### Toolsets quick-reference

| Toolset | Typical use |
|---|---|
| `core` | Always-on — org context, metadata retrieval |
| `apex` | Write, execute, and debug Apex code |
| `deploy-retrieve` | Push/pull metadata between local and org |
| `data` | SOQL queries and record manipulation |
| `sobjects` | Inspect SObject schema |
| `testing` | Run Apex tests, read results |
| `documentation` | Fetch Salesforce developer docs |
| `agent` | Configure Agentforce agents |
| `flow` | Build and debug Flows |
| `lwc-experts` | LWC guidance and SLDS styling |
| `code-analysis` | Static analysis with Code Analyzer |
| `source-tracking` | Diff local vs org |
| `orgs` | Create/delete/open scratch orgs and snapshots |
| `template` | Project and scratch-org templates |
| `enrichment` | Metadata enrichment for better LLM context |

---

## 6. This workspace configuration

`.vscode/mcp.json` — VS Code scope, committed to the repository:

```json
{
  "servers": {
    "Salesforce DX": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp",
        "--orgs",     "john.doe@testing.com",
        "--toolsets", "users,testing",
        "--allow-non-ga-tools"
      ]
    }
  }
}
```

This configuration:
- Targets the `john.doe@testing.com` (or alias) org
- Exposes the `users` and `testing` toolsets
- Enables non-GA tools (pilot / beta features)

To update it from within VS Code, open the **MCP tab** in the Salesforce Github Copilot sidebar, select the desired toolsets and tools, then click **Install for Workspace (VS Code)**.

---

## 7. Managing servers from the extension

The **MCP tab** in the Salesforce Github Copilot sidebar provides a GUI for the operations above:

| Action | How |
|---|---|
| View detected configs | Open the MCP tab — each config file shows as a row |
| Open a config file in the editor | Click **SHOW** next to the file path |
| Install / reconfigure for VS Code | Select toolsets → **Install for Workspace (VS Code)** |
| Install / reconfigure for Claude Code | Select toolsets → **Install for Workspace (Claude Code)** |
| Enable non-GA tools | Check **--allow-non-ga-tools** before installing |
| Refresh detection | Click **↻** next to the Configuration heading |
| Read live toolsets from the installed server | Click **⟳ from server** next to the Toolsets heading |

### Built-in catalog vs. live discovery

The Toolsets list defaults to a **built-in catalog** bundled with the extension. Click **⟳ from server** to replace it with the toolsets, tools and GA/non-GA status read from the `@salesforce/mcp` server **actually installed on your machine** (via `npx -y @salesforce/mcp`). This requires a default org (`sf org display`) and can take ~30s the first time while `npx` downloads the package.

How it works: the extension speaks the MCP stdio protocol directly. Because `tools/list` is flat (no toolset grouping or GA flag), the extension probes each toolset individually for membership and diffs a full `--toolsets all` run **with vs. without** `--allow-non-ga-tools` to classify GA vs. non-GA. If discovery fails for any reason, the built-in catalog stays in place. The source indicator under the Toolsets heading shows which list is active (`○ Built-in` / `● Live`).

---

## 8. Troubleshooting

### Server does not start

1. Verify `npx`, `node`, `python`, or `docker` is on the system `PATH`:
   ```bash
   npx --version
   node --version
   ```
2. Run the command manually in a terminal to see raw error output:
   ```bash
   npx -y @salesforce/mcp --orgs user@org.com --toolsets core
   ```
3. Check the **Output** panel in VS Code (`View → Output`) and select **GitHub Copilot — MCP** from the dropdown.

### Salesforce org not found

```bash
sf org display          # confirm a default org is set
sf org list             # list all authenticated orgs
sf org login web        # re-authenticate if needed
```

### Non-GA tools not appearing

Ensure `--allow-non-ga-tools` is present in the `args` array **and** the relevant toolset is also included. Non-GA tools are silently omitted if the flag is absent.

### Claude Code picks up a different config than VS Code

Claude Code reads `.mcp.json` (workspace root) or `~/.claude/mcp.json`.
VS Code reads `.vscode/mcp.json` or user settings.
They are **independent files** — a change to one does not affect the other. Use the extension's **Install** buttons to write both if needed.
