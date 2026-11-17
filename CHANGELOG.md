# Change Log

All notable changes to the "salesforce-copilot-inspector" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.4.0]

### Added

- Workspace tab: new **Initialize Project Configuration** button. A popup lists the 19 standard files from BEST_PRACTICES.md (AGENTS.md, instructions, prompts, custom agents, hooks, MCP, settings, coding-agent setup; no skills), marks the ones that already exist, and creates only the selected missing files. Existing files are never overwritten
- Initialize Project Configuration: generated files use the API version and package directory from `sfdx-project.json`; the generated hook blocks Salesforce CLI deploys and deletes that name no target org or a protected one (bash and PowerShell versions); the MCP configuration uses `DEFAULT_TARGET_ORG` instead of a personal username
- Docs: new [RULES_AND_ORDERS.md](RULES_AND_ORDERS.md) — when and in which order instructions, skills, prompts, agents, hooks, extensions and settings are triggered, agents vs skills, worked examples, and how to verify what was used
- Docs: new [BEST_PRACTICES.md](BEST_PRACTICES.md) — recommended Copilot configuration for a Salesforce DX project, with ready-to-copy files, MCP and cloud coding agent setup, and anti-patterns
- README: links to both guides and documentation of the new button

## [0.3.0]

### Added

- Skill Usage Monitor: new editor panel showing how often GitHub Copilot and Claude Code use each skill, read from local chat sessions, Claude Code transcripts and `~/.claude.json` counters
- Skill Usage Monitor: activity chart, per-skill table (uses, last use, workspaces, install location), unused installed skills, Claude Code plugin usage
- Skill Usage Monitor: period / agent / current-workspace filters and buttons that run `/skill-doctor`, `/doctor`, `/plugin` and `/usage` in a terminal
- Sidebar: new 📈 Usage button next to Summary; new "Open Skill Usage Monitor" command
- Checks tab: new **Help** button on each category header (Instructions, Skills, Prompts, Agents, Copilot Hooks, Extensions, Settings) opening a popup with: when it is triggered, format, location, common use, an example, tips and what the tab checks
- Salesforce Skills Library: batch installs run behind a cancellable progress notification and end with a summary; installed skills are unticked, failed ones stay selected for a retry

### Fixed

- Salesforce Skills Library: "Install Selected" asks for the install location once for the whole batch instead of once per skill (the repeated pickers were dismissed and cancelled the batch)
- Salesforce Skills Library: GitHub downloads now time out after 20 s, so a stalled request can no longer leave an install hanging
- Salesforce Skills Library: binary assets are written byte-for-byte instead of being corrupted by UTF-8 decoding; a references/assets download failure (e.g. GitHub rate limit) is now reported instead of silently ignored
- Salesforce Skills Library: ↻ Refresh now clears the "installed" badge of skills deleted from disk (the installed list was only ever added to)
- Checks tab: deleting a skill now removes its whole folder (`SKILL.md`, `references/`, `assets/`) instead of only `SKILL.md`, which left an orphaned folder behind
- Skill validation: fixed a false "metadata must be a key-value map, not a YAML list" error on skills whose `metadata:` map contains nested lists (e.g. `relatedSkills:` in forcedotcom/sf-skills); only the map's direct children are now considered

## [0.2.0]

- Salesforce Skills Library: added checkboxes to the skills table for selecting several skills at once
- Salesforce Skills Library: added an "Install Selected" button that installs every ticked skill in one batch, reporting progress as it goes
- Salesforce Skills Library: the header checkbox selects or unselects only the skills matching the active search filter, leaving selections made under other filters untouched
- Salesforce Skills Library: the stats line now shows the number of selected skills next to the total
- Packaging: excluded the `doc/` and `.sf/` folders from the published extension

## [0.1.1]

- Salesforce Skills Library: table columns are now resizable via drag handles
- Salesforce Skills Library: increased font sizes across the panel for readability
- Sidebar (Checks / Workspace / Personal / MCP tabs): increased font sizes across the panel for readability

## [0.1.0]

- Initial release