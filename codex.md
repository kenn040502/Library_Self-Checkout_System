# Codex Report Writing Rules

This file is the standing instruction for working on the Sprint 4 report in this repository.

## Before Writing Any Report Section

Codex must read or re-check the marking rubric before drafting, editing, or recommending content for any report section.

Primary rubric source:

- `report-writing-order.md`

When working on a specific section, Codex must identify the exact rubric item that applies to that section before giving advice or drafting text.

For example:

- Sprint Plan: practical, detailed, complete, and logically connected.
- Sprint Review: what was demonstrated to the client, client feedback, and critical analysis of progress and feedback.
- Project Review: plans vs achievements, deviations, justifications, and honest progress story.
- Project Retrospect: strengths, challenges, and takeaways across all required dimensions.

## Anti-Hallucination Rules

Codex must not invent:

- Client feedback
- Meeting outcomes
- Handover results
- Supervisor comments
- User acceptance testing results
- Individual contribution details
- Final deliverables that are not supported by evidence

If evidence is missing, Codex must use a clear placeholder instead.

Recommended placeholder wording:

```text
[Placeholder: to be completed after client handover / feedback is received.]
```

or

```text
[Placeholder: evidence/screenshots/commit references to be added.]
```

## Evidence Rules

When drafting report content, Codex should use available evidence first:

- Current repository files
- Git commit history
- Branch names
- Existing Sprint 1-3 reports in `past_sprint_report/`
- The Sprint 4 draft document
- Screenshots or notes provided by the user

For Sprint 4, Codex should treat client feedback as unavailable unless the user explicitly provides it.

## Required Working Pattern

For each report section, Codex should follow this order:

1. Read the relevant rubric item.
2. Read the relevant source material.
3. State what the section needs to satisfy.
4. Decide suitable sub-sections, if needed.
5. Draft or help the user draft the section.
6. Clearly mark placeholders and missing evidence.
7. Summarise what was done.

## Required Status Summary

After helping with any section, Codex should briefly report:

```text
What I checked:
- ...

What we decided / drafted:
- ...

Still missing:
- ...
```

This prevents losing track of decisions and avoids repeatedly asking the user for the same context.

## Sprint Plan Specific Rules

Before working on Sprint Plan, Codex must remember the rubric:

```text
Sprint plan is practical, detailed and complete. Sprints are logically connected.
```

Sprint Plan should normally use this structure unless the user changes it:

```text
1. Sprint Context and Goal
2. Logical Connection to Previous Sprints
3. Scope and Priorities
4. Team Roles and Responsibilities
5. Sprint Backlog and Planned Tasks
6. Capacity, Forecast and Dependencies
7. Definition of Done
8. Milestones and Review Artifacts
```

Sprint Plan must explain that Sprint 4 is the final sprint and should focus on stabilisation, bug fixing, testing, final reporting, evidence collection, and handover preparation rather than major new feature development.

## Sprint Review Specific Rules

Before working on Sprint Review, Codex must remember the rubric requires:

```text
1. what was demonstrated to the client
2. feedback client provided
3. Critical analysis of progress and feedback
```

If no client feedback exists, Codex must not invent it. Use a placeholder and state that the section must be completed after handover or feedback is received.

## Contribution Details Specific Rules

Contribution Details must be supported by evidence.

Acceptable evidence includes:

- GitHub commits
- Screenshots of implemented screens
- Research summaries
- Testing outcomes
- Documentation work

For Kelvin's contribution, Codex should use Git commit history from this repository unless the user provides extra evidence.

## Tone and Style Rules

The report should sound like a student team report:

- Clear
- Honest
- Specific
- Evidence-based
- Not overly polished to the point of sounding fake

Avoid unsupported claims such as:

- "The client was very satisfied" unless feedback evidence exists.
- "All bugs were fixed" unless testing evidence supports it.
- "The project was fully completed" unless limitations are also discussed honestly.

Prefer wording such as:

- "The team planned to..."
- "The team aimed to..."
- "Based on repository evidence..."
- "This will be completed after client feedback is received..."

