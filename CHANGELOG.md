# Change Log

All notable changes to the "salesforce-github-copilot" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.0]

- MCP tab: **⟳ from server** reads the live toolset list, tools and GA/non-GA
  status from your installed `@salesforce/mcp` server over the MCP stdio
  protocol, falling back to the built-in catalog when discovery is unavailable.
  A source indicator shows whether the built-in or live list is active.
- Fixed non-GA tool descriptions not rendering in the MCP tab.

## [0.1.0]

- Initial release