# Change Log

All notable changes to the "salesforce-copilot-inspector" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Skill Usage Monitor: new editor panel showing how often GitHub Copilot and Claude Code use each skill, read from local chat sessions, Claude Code transcripts and `~/.claude.json` counters
- Skill Usage Monitor: activity chart, per-skill table (uses, last use, workspaces, install location), unused installed skills, Claude Code plugin usage
- Skill Usage Monitor: period / agent / current-workspace filters and buttons that run `/skill-doctor`, `/doctor`, `/plugin` and `/usage` in a terminal
- Sidebar: new 📈 Usage button next to Summary; new "Open Skill Usage Monitor" command

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