# I-Ops

> I-Ops makes AI workers finish real tasks correctly: it works out what context a task needs,
> acquires what is missing under the company's own permissions, governs consequential actions, and
> then independently verifies the outcome.

The principle underneath it: **the worker that did the work does not get to declare it complete.**
The checks are computed by code, so swapping the model does not change the guarantee.

Company: I-Ops Operations Intelligence LLC. Website: https://i-ops.dev

## Open-source tools (Apache-2.0, run locally, no account)

| Tool | What it answers | Install |
|---|---|---|
| assurance | What a run covered, what it spent, what it may do, and what it is about to install. CLI, MCP server and a Claude Code plugin. | `uvx assurance audit` |
| rooms | Who built this project, and which AI helped. Attributed from git history alone. | `npx iops-rooms week` |
| rollcall | Every AI process running here, and what a stop would not reach. Zero dependencies. | `npx iops-rollcall` |

Source for all three: https://github.com/i-ops-hq
Assurance is listed in Anthropic's plugin directory and on the official MCP registry.

## What we do not claim

- No paying customers and no design partners today.
- Package download counts are mostly crawlers and mirrors. We do not report them as users.
- The desktop app is an MVP in private testing. Some layers are designed and not built, and the
  documentation says which.
- Nothing here governs an agent on a machine we cannot see, and we do not claim a sandbox.

## Contact

- GitHub (company): https://github.com/i-ops-hq
- LinkedIn (company): https://www.linkedin.com/company/i-ops-llc/
- Email: hello@i-ops.dev
- Founder: Ashwinth Kondapalli — https://github.com/AshPlayer-1415

Human-readable version of this page: https://i-ops.dev/agents/
