---
name: refactor-safely
description: Plan and execute repository refactors using code-review-graph dependency analysis, rename previews, dead-code checks, impact radius, affected flows, and validation.
---

# Refactor Safely

Use this skill when planning or executing a refactor in this repository.

## Workflow

1. Start with `get_minimal_context(task="<refactor task>")`.
2. Use `refactor_tool` with `mode="suggest"` for graph-driven refactoring suggestions when the refactor target is broad.
3. Use `refactor_tool` with `mode="dead_code"` when removing unreferenced functions or classes.
4. For renames, use `refactor_tool` with `mode="rename"` to preview all affected locations.
5. Review the preview before applying; use `apply_refactor_tool` with the returned `refactor_id` only when the edit list matches the intended scope.
6. Use `get_impact_radius` before major edits and `get_affected_flows` for critical-path risk.
7. After changes, run `detect_changes` and relevant tests to verify the refactor impact.

## Safety Checks

- Preserve behavior unless the user explicitly requested behavior changes.
- Keep edits surgical; avoid adjacent cleanup unless your refactor creates the issue.
- Check test coverage around high-risk or high-degree nodes.
- If graph output conflicts with file reality, inspect targeted files before editing.

## Token Efficiency

- Use `detail_level="minimal"` first.
- Escalate to `standard` only when minimal output lacks needed source or relationship detail.
- Aim to complete graph planning in five tool calls or fewer before implementation.
