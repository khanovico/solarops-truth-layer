---
name: debug-issue
description: Systematically debug repo issues using code-review-graph navigation, call-chain tracing, affected flows, recent-change analysis, and impact radius checks.
---

# Debug Issue

Use this skill when debugging a defect, failing behavior, or suspicious regression in this repository.

## Workflow

1. Start with `get_minimal_context(task="<debug task>")`.
2. Use `semantic_search_nodes` with `detail_level="minimal"` to find code related to the issue.
3. Use `query_graph` with `callers_of` and `callees_of` to trace the surrounding call chain.
4. Use `get_flow` or `get_affected_flows` to identify execution paths through suspected areas.
5. Run `detect_changes` to check whether recent changes likely caused the issue.
6. Use `get_impact_radius` on suspected files before editing to understand blast radius.

## Tips

- Check both callers and callees before changing code.
- Find the entry point that triggers the bug, then narrow to the failing function.
- Treat recent changes as likely suspects, but verify with tests or reproduction.
- Prefer focused tests that reproduce the bug before implementation.

## Token Efficiency

- Use `detail_level="minimal"` first.
- Escalate to `standard` only when minimal output lacks needed source or relationship detail.
- Aim to complete graph exploration in five tool calls or fewer before switching to targeted file reads.
