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

Source: https://github.com/i-ops-hq
Assurance is listed in Anthropic's plugin directory and on the official MCP registry.

## The false-completion index

One question, to be measured the same way every month: when a coding agent's last message says the
tests pass, how often does the session's own record show no test passing after its last edit? Five
figures for this are already published. They run from 0.0% to 75.8%, and no two are comparable,
because each uses a different definition of a claim, a different definition of false, and a
different judge.

The method is published and the number is not. The first number publishes at 25 contributed sessions
from at least 10 distinct machines outside I-Ops; today that count is zero, because nothing has been
built to contribute with. Definition, the five sources, and the gate:
https://i-ops.dev/false-completion/

## What we do not claim

- Package download counts are mostly crawlers and mirrors. We do not report them as users.
- The desktop app is an MVP in private testing. Some layers are designed and not built, and the
  documentation says which.
- Nothing here governs an agent on a machine we cannot see, and we do not claim a sandbox.
- We publish no figure for how often agents falsely claim their tests passed. Five figures exist,
  none comparable with another, and ours waits for the threshold stated above.

## Contact

- GitHub (company): https://github.com/i-ops-hq
- LinkedIn (company): https://www.linkedin.com/company/i-ops-llc/
- Email: hello@i-ops.dev
- Founder: Ashwinth Kondapalli — https://github.com/AshPlayer-1415 — https://www.linkedin.com/in/ashwinth-reddy/ — ashwinth@i-ops.dev

Human-readable version of this page: https://i-ops.dev/agents/
