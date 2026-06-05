# Sprint 4 Report Session Handover

Generated on: 2026-06-05, Asia/Kuala_Lumpur  
Source repo path: `C:\Users\fongk\Documents\Assignment\Library_Self-Checkout_System`  
Main Sprint 4 report file provided by user: `C:\Users\fongk\Downloads\Group 12 COS40006 Sprint 4.docx`

This handover is for continuing the COS40006 Sprint 4 report writing work on another computer or in another Codex session.

## How To Resume

At the start of the next session, ask Codex to read these files first:

```text
handoff_package/REPORT_SESSION_HANDOVER_2026-06-05.md
codex.md
report-writing-order.md
project-retrospect-draft.md
sprint-retrospect-draft.md
sprint-review-3.2-draft.md
project-retrospect-rubric-check.md
```

Then use this prompt:

```text
Please first read handoff_package/REPORT_SESSION_HANDOVER_2026-06-05.md, codex.md, and report-writing-order.md. Then continue helping me complete the COS40006 Sprint 4 report. Always check the rubric first, do not invent client feedback, and ask me if evidence is missing.
```

Important: several report helper files are currently untracked by Git, so make sure the other computer has the Markdown draft files listed above, not only the source code.

## User Preferences And Working Style

The user prefers Chinese conversation, but the report content itself should be written in English.

The user wants the report to be:

- clear and easy for the marker to understand;
- honest and evidence-based;
- not overly polished or overly AI-like;
- not full of obvious template labels unless needed;
- not written with unsupported claims.

For report writing, always prioritise rubric alignment over fancy wording.

The user specifically dislikes unnecessary numbered formats and overly rigid labels such as:

```text
Strength:
Challenge:
What could have been done differently:
Takeaway:
```

Use natural paragraphs instead, but still make sure each section contains the strength, challenge, improvement, and lesson clearly.

## Standing Rules Already Created

The file `codex.md` contains the standing rules for this report. The most important rules are:

- Always read or re-check `report-writing-order.md` before drafting or editing a report section.
- Do not invent client feedback, handover results, supervisor comments, user acceptance test results, or contribution details.
- If evidence is missing, use a placeholder.
- Use evidence from current repo files, Git commits, branch names, Sprint 1-3 reports, Sprint 4 template, screenshots, and user notes.
- Treat Sprint 4 client feedback as unavailable unless the user explicitly provides it.

## Rubric Summary

The full rubric is stored in `report-writing-order.md`. Key items:

| Section | Marks | Rubric Focus |
|---|---:|---|
| Contribution | 15 | Individual contribution should show sufficient and balanced contribution, supported by evidence. |
| Sprint Plan | 15 | Practical, detailed, complete, and logically connected to previous sprints. |
| Delivery & Feedback | 10 | Handover description, what worked well, challenges, feedback from all parties. |
| Sprint Review | 20 | What was demonstrated to the client, feedback from client, and critical analysis of progress/feedback. |
| Sprint Retrospect | 10 | Process-related challenges with detailed analysis of reasons. |
| Project Review | 15 | Plans vs achievements, deviations with justification, honest story of progress. |
| Project Retrospect | 15 | Strengths, challenges, and takeaways across project management, ethics, requirements, design, quality, stakeholder management, and team process. |

## Main Report Template Sections

The Sprint 4 DOCX template includes:

- Contribution summary
- Contribution Details
- Sprint plan
- Final delivery and feedback
- Sprint review (Critical review of the product)
- Retrospect (Critical review of the process)
- Project review
- Project Retrospect

There are two different retrospect sections:

- Section 4 Retrospect: Sprint 4 process only.
- Section 6 Project Retrospect: whole project reflection across all required dimensions.

Do not mix these two.

## Past Sprint Reports

Past reports are stored in `past_sprint_report/`:

```text
past_sprint_report/Group 12 COS40006 Sprint 1 Reports.pdf
past_sprint_report/Group 12 COS40006 Sprint 2.pdf
past_sprint_report/Group 12 COS40006 Sprint 3.pdf
```

Important evidence from Sprint 1:

- Focused on improving the existing system from the previous semester.
- Addressed security vulnerabilities.
- Worked on AI book recommendation, Learning Path, LinkedIn Learning idea, and Gemini/fallback behaviour.
- Retrospect mentioned AI recommendation quality issues, inconsistent availability data, project behind schedule, and need for better client communication.

Important evidence from Sprint 2:

- Focused on completing and deploying the system.
- Database naming was changed to meet client-required format: table names PascalCase, column names snake_case.
- Reservation and notification workflows improved.
- AI tagging had issues and had to be changed to fixed categories.
- Linear/task tracking was inconsistent.
- Lessons included UI/UX issues, AI reliability concerns, prompt injection/detection difficulty, and need for clearer standards.

Important evidence from Sprint 3:

- Focused on UI upgrade, AI fine-tuning, Learning Hub, and preparing for UAT.
- CI/build/Jest checks were introduced or strengthened.
- Feature ownership became clearer.
- Unified UI design became a major improvement.
- Retrospect mentioned estimation issues, merge/integration problems, and the need for clearer Sprint 4 focus.

## User-Provided True Context

These are facts provided by the user and should be treated as ground truth unless updated:

- Sprint 4 merges mostly happened in the last few days.
- Kelvin/user was the single main GitHub owner, so many GitHub/integration responsibilities fell on Kelvin.
- Report writing and coding happened at the same time near the end, making the process rushed.
- The team was not proactive enough in contacting the client.
- Communication happened through WhatsApp and weekly Microsoft Teams meetings.
- Weekly meetings existed, but the user did not attend all of them.
- Nigel, Ken, and Ivan each worked on their own branches.
- Some members proactively fixed bugs.
- Everyone helped with final testing.
- Kelvin's own procrastination/time management was a process issue.
- Team members had uneven technical ability.
- Bug fixing was informal: whoever found a bug usually fixed it.
- There is no "future sprint" because the project is ending, so action items should be written as lessons or final submission/handover actions.
- There was no final client video/demo/formal presentation at the time of writing.
- There was no formal Sprint 4 client feedback at the time of writing.
- Client feedback should not be invented.

## Sprint Plan Status

Sprint Plan was discussed and considered acceptable.

Chosen Sprint Plan structure:

```text
1. Sprint Context and Goal
2. Continuation from Previous Sprints
3. Scope and Priorities
4. Team Roles and Responsibilities
5. Sprint Backlog and Planned Tasks
6. Capacity, Forecast and Dependencies
7. Definition of Done
8. Milestones and Review Artifacts
```

Important Sprint Plan content:

- Sprint 4 is the final sprint.
- It should focus on stabilisation, bug fixing, testing, final reporting, evidence collection, and handover preparation.
- It should not present Sprint 4 as a sprint for major new implementation.
- Client feedback is unavailable; use placeholder if needed.

Scrum master / sprint coordinator:

- Kenneth
- Kelvin

Assignees based on GitHub branch/commit evidence:

| Backlog Area | Suggested Assignee(s) |
|---|---|
| Checkout, check-in, quick return | Kenneth, Kelvin |
| Holds, pickup expiry, cancellation notifications | Nigel, Kenneth |
| Damage report workflow | Nigel, Kenneth, Ivan |
| Notifications | Kenneth, Nigel |
| Reading Assistant / DeepSeek | Kelvin |
| Admin/staff/profile/role management | Nigel, Ivan |
| Mobile UI, navigation, FAQ, Learning Hub | Kenneth, Ivan, Kelvin |
| Testing, evidence, handover preparation | All members |

Suggested estimated hours:

| Member | Estimate |
|---|---:|
| Kenneth | 20-25 hours |
| Ivan | 15-20 hours |
| Kelvin | 25-30 hours |
| Nigel | 20-25 hours |
| Total | 80-100 hours |

## Sprint Review Status

File created:

```text
sprint-review-3.2-draft.md
```

This file contains `3.2 Progress Against Sprint Backlog` with sections `3.2.1` to `3.2.8`.

The user preferred section-based writing instead of one large table because screenshots are table-unfriendly.

Current Sprint Review assumptions confirmed by user:

- Screenshots will be taken by the user later, or Codex can list screenshot locations.
- There are build tests and manual testing.
- All listed features are currently normal.
- No final client demo/video/presentation has happened yet.
- No formal Sprint 4 client feedback has been received.
- Deliverable wording should be medium/confident: "internally ready for final demonstration, pending client validation."

Use this wording style:

```text
The feature was internally tested and is ready for final demonstration, pending client validation.
```

Do not write:

```text
The client approved this feature.
```

## Sprint Retrospect Status

File created:

```text
sprint-retrospect-draft.md
```

This is Section 4 Retrospect, not Section 6 Project Retrospect.

Current structure:

```text
# 4 Retrospect (Critical Review of the Process)
## 4.1 What Went Well
## 4.2 What Did Not Go Well
## 4.3 What Can Be Improved
## 4.4 Action Items to Be Done
## 4.5 General Observations from Sprint 4
```

This structure follows Sprint 1-3 report style.

Main Sprint 4 process points included:

- Team members worked through own branches and feature ownership.
- WhatsApp and Teams were used for communication.
- Everyone helped final testing.
- Main problems were late merges, rushed report/coding, Kelvin as GitHub bottleneck, uneven skill level, and weak client contact.
- Action items are framed as final submission/handover lessons because the project is ending.

## Project Retrospect Status

File created and currently in best version:

```text
project-retrospect-draft.md
```

Rubric check file:

```text
project-retrospect-rubric-check.md
```

Current Project Retrospect headings:

```text
# 6 Project Retrospect
## 6.1 Project Management Approach
## 6.2 Adherence to Ethical Standards
## 6.3 Requirement Engineering
## 6.4 Plan and Design
## 6.5 Quality
## 6.6 Stakeholder Management
## 6.7 Team Process
## 6.8 Overall Takeaway
```

Current style:

- Natural paragraphs.
- Simple wording.
- No obvious `Strength:` / `Challenge:` labels.
- Each section still includes good points, weak points, what should be done differently, and main lesson.
- A small summary table was added at the end of `6.8 Overall Takeaway`.

Key corrections already made:

- Sprint 1 is described as improving the existing system from the previous semester, not building the first version from zero.
- Stakeholder Management includes both supervisor and client.
- Client issue is written honestly: the team did not contact the client early enough.
- Overall status is written as internally tested and prepared for final client review once demo is arranged, not client-approved.

The summary table at the end uses columns:

```text
Area | What Went Well | What Was Not So Good | Key Lesson
```

This table covers all seven rubric areas.

## GitHub / Commit Evidence Used

Use `origin/main` as the evidence source, because it includes the latest remote commit.

Important Sprint 4 evidence:

| Commit | Evidence |
|---|---|
| `cf2d377` | Quick return confirmation modal fix and related test. |
| `32994e2` | Damage report portal return condition modal fix. |
| `d04f05b` | Damage report resolution update and migration. |
| `5168967` | Damage report notifications, pickup expired notifications, damage actions, edit/delete, export route, notification migrations. |
| `fc347f9` | General chat history metadata response test alignment. |
| `42da408` | AI difficulty level. |
| `8d81396` | Re-added Learning Hub nav button. |
| `abdbf32` | AI feature refinement. |
| `e995458` | Role-select UI fix. |
| `3327caa` | Admin user management logic fix. |
| `b86908f` | Staff dashboard checkout and return. |
| `92d94b0` | Side navigation update. |
| `3d732b5` | SIP/news feed related work. |
| `8ff88da` | Search filter refinement. |
| `a8a80f9` | Learning Hub short video UI update. |
| `9bce6c5` | My Books mobile horizontal overflow fix. |
| `f9985e7` | Notification UI. |
| `b41da61` | Loan history page UI fixing. |
| `cc0bce2`, `dc51d70`, `eda51a0` | Damage report detail/form/page fixes. |
| `5f107ed`, `4dcd5ec` | Profile page role/display fixes. |
| `ff84457` to `d18829c` series | DeepSeek / Reading Assistant hardening, prompt sanitiser, schema validator, SSE streaming, tests, docs. |

Recent shortlog since 2026-05-08 on `origin/main`:

```text
Kidemi04 37
print1Username 18
KEN 11
Lucifr7 6
```

Longer project shortlog since 2026-03-01:

```text
Kidemi04 263
print1Username 79
KEN 62
Lucifr7 31
Kelvin Fong Wen Kiong 9
```

Do not overuse raw commit counts as contribution proof without context, because authorship names may not map perfectly to students. Use branch ownership and feature evidence as well.

## Current Files Created During This Report Session

```text
codex.md
report-writing-order.md
sprint-review-3.2-draft.md
sprint-retrospect-draft.md
project-retrospect-draft.md
project-retrospect-rubric-check.md
handoff_package/REPORT_SESSION_HANDOVER_2026-06-05.md
```

Existing project handoff file:

```text
handoff_package/HANDOFF.md
```

Do not overwrite `handoff_package/HANDOFF.md` unless the user asks. It appears to be an earlier project/code handoff package.

## Current Git Status At Time Of This Handover

Observed status:

```text
A  codex.md
A  handoff_package/HANDOFF.md
A  past_sprint_report/Group 12 COS40006 Sprint 1 Reports.pdf
A  past_sprint_report/Group 12 COS40006 Sprint 2.pdf
A  past_sprint_report/Group 12 COS40006 Sprint 3.pdf
A  report-writing-order.md
?? project-retrospect-draft.md
?? project-retrospect-rubric-check.md
?? sprint-retrospect-draft.md
?? sprint-review-3.2-draft.md
```

After creating this file, `handoff_package/REPORT_SESSION_HANDOVER_2026-06-05.md` will also be untracked unless staged later.

The report helper files are not committed yet. If working on another computer, make sure these report files are available there.

## Remaining Work

Recommended next report tasks:

1. Insert or adapt `project-retrospect-draft.md` into the Sprint 4 DOCX.
2. Insert or adapt `sprint-retrospect-draft.md` into Section 4 of the Sprint 4 DOCX.
3. Continue Sprint Review:
   - use `sprint-review-3.2-draft.md`;
   - add screenshots where placeholders indicate;
   - keep client feedback placeholder if no feedback arrives.
4. Write Project Review:
   - compare planned deliverables vs achieved deliverables across the whole project;
   - explain deviations honestly with evidence.
5. Write Contribution Details:
   - use GitHub commits, branch ownership, screenshots, testing evidence, and report work;
   - do not rely only on raw commit counts.
6. Write or complete Final Delivery and Feedback:
   - if no client reply before due date, clearly state no formal feedback was received before submission;
   - describe planned handover and internal readiness;
   - do not claim handover success unless it happened.

## Screenshot Placeholders To Prepare

Useful screenshots for Sprint Review:

- Checkout form / staff dashboard checkout.
- Check-in / quick return confirmation modal.
- Holds or cancellation / pickup expiry notification.
- Damage report form and staff damage report detail/resolution modal.
- Notification popover showing relevant notification types.
- Reading Assistant / DeepSeek response UI.
- Admin user management or profile role select.
- Mobile navigation / FAQ / Learning Hub.
- Build/test evidence or terminal output, if accepted by report style.

## Safe Phrases To Use

Use:

```text
At the time of writing, no formal Sprint 4 client feedback had been received.
```

```text
The system was internally tested and prepared for final client review once the demo is arranged.
```

```text
The team can only claim internal readiness, not client approval.
```

```text
The client communication issue was mainly caused by the team not arranging the final demo and feedback request early enough.
```

Avoid:

```text
The client approved the system.
```

```text
The handover was successful.
```

```text
All requirements were fully completed.
```

```text
All tests passed.
```

Only write "all tests passed" if a fresh test/build command has been run and verified in the current session.

## Current Best Project Retrospect Judgment

The current `project-retrospect-draft.md` is considered ready to use, subject to the user's final content check.

It matches the template because it covers:

- Project management approach
- Adherence to ethical standards
- Requirement engineering
- Plan and design
- Quality
- Stakeholder management (client and supervisor)
- Team process

It matches the rubric because each area includes:

- what went well;
- what was not so good;
- what could have been done differently;
- a clear lesson/takeaway.

The current version is intentionally written in simple English so the marker can understand it quickly.
