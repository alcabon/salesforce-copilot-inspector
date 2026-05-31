# Node.js Installation via NVM

This project requires **Node.js ≥ 20.19.0 or ≥ 22.12.0** (imposed by `@salesforce/mcp` — v20.18.x and earlier are not supported).

---

## What is NVM?

**NVM** (Node Version Manager) lets you install and switch between multiple Node.js versions without touching system-level paths. It is **not** an npm package — it is a standalone executable installer.

| Platform | Tool | Install method |
|---|---|---|
| Windows | [nvm-windows](https://github.com/coreybutler/nvm-windows) | `.exe` installer (not npm) |
| macOS / Linux | [nvm](https://github.com/nvm-sh/nvm) | Shell script (not npm) |

---

## Install NVM for Windows

1. Go to [github.com/coreybutler/nvm-windows/releases](https://github.com/coreybutler/nvm-windows/releases)
2. Download `nvm-setup.exe` from the latest release
3. Run the installer — it registers `nvm` on your `PATH` automatically
4. Open a **new** terminal (PowerShell or CMD) to pick up the updated `PATH`

---

## Manage Node.js versions

```powershell
# List installed versions (active version is marked with *)
nvm list

# List versions available to install (latest LTS and current)
nvm list available

# Install the latest LTS (recommended for stability)
nvm install lts

# Install a specific version matching the project requirement
nvm install 22

# Activate a version for the current shell and all subsequent shells
nvm use 22

# Confirm active version
node --version   # should print v22.x.x
npm --version    # should print 10.x.x
```

---

## Recommended version for this project

```powershell
nvm install 22
nvm use 22
```

This satisfies both the `@salesforce/mcp` engine requirement (≥ 22.12.0) and the `@types/node: 22.x` dev dependency in `package.json`.

After switching, install project dependencies:

```powershell
npm install
```

---

## Tips

- Run `nvm use <version>` once per new terminal session (or set a default in your profile).
- A `.nvmrc` file at the project root can pin the version — `nvm use` (no argument) reads it automatically on macOS/Linux. On Windows, `nvm use $(cat .nvmrc)` achieves the same.
- The MCP tab **CHECK** button in the extension reports the exact Node.js version mismatch if the active version is too old.
