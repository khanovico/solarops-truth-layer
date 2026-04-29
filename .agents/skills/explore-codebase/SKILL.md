---
name: explore-codebase
description: Explore and understand this repository using code-review-graph architecture, community, semantic search, import, caller, callee, and execution-flow tools.
---

# Explore Codebase

Use this skill when locating code, understanding architecture, or tracing relationships in this repository.

## Workflow

1. Start with `get_minimal_context(task="<exploration task>")`.
2. Run `list_graph_stats` when you need overall codebase metrics.
3. Run `get_architecture_overview` for high-level community structure.
4. Use `list_communities` and `get_community` to inspect major modules.
5. Use `semantic_search_nodes` to find specific files, functions, classes, or concepts.
6. Use `query_graph` with `callers_of`, `callees_of`, `imports_of`, `importers_of`, or `children_of` to trace relationships.
7. Use `list_flows` and `get_flow` to understand execution paths.

## Tips

- Start broad, then narrow to specific files and symbols.
- Use `children_of` on a file to list its functions and classes.
- Use `find_large_functions` when searching for complex code that may need decomposition.
- Fall back to shell search only after graph tools do not cover the question.

## Token Efficiency

- Use `detail_level="minimal"` first.
- Escalate to `standard` only when minimal output lacks needed source or relationship detail.
- Aim to complete initial exploration in five graph calls or fewer before targeted file reads.
