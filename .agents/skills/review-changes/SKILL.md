---
name: review-changes
description: Perform structured repository code reviews using code-review-graph change detection, affected flows, impact radius, and test coverage checks.
---

# Review Changes

Use this skill when reviewing local changes, a branch, or a PR for this repository.

## Workflow

1. Start with `get_minimal_context(task="<review task>")`.
2. Run `detect_changes` with `detail_level="minimal"` to get risk-scored change analysis.
3. Run `get_affected_flows` to find impacted execution paths.
4. For high-risk functions or files, use `query_graph` with `pattern="tests_for"` to check coverage.
5. Run `get_impact_radius` when blast radius is unclear.
6. Suggest specific missing tests for untested risky changes.

## Output Format

Lead with findings, ordered by severity:

- High
- Medium
- Low

For each finding, include:

- What changed and why it matters.
- File and line reference when available.
- Test coverage status.
- Suggested fix or validation.

Then include open questions, residual risk, and a brief change summary.

## Token Efficiency

- Use `detail_level="minimal"` first.
- Escalate to `standard` or source snippets only for specific findings.
- Aim to complete initial review context in five graph calls or fewer before targeted file reads.
