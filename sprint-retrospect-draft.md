# 4 Retrospect (Critical Review of the Process)

## 4.1 What Went Well

Sprint 4 worked best when the team kept the final sprint focused on stabilisation instead of expanding the scope with unrelated new features. Since this was the final sprint, the team needed to prioritise stability, testing, report evidence, and final delivery preparation. This focus also responded to Sprint 3 feedback that the main purpose of the system should remain the check-in and check-out process. As a result, Sprint 4 work was directed mainly toward circulation workflows, hold handling, damage reports, notifications, staff/admin tools, Reading Assistant stability, mobile UI fixes, and final testing.

The team also maintained communication through WhatsApp and weekly Microsoft Teams meetings. WhatsApp was useful for quick updates, bug reports, and short follow-ups, while Teams meetings provided a more formal space to discuss progress. Even though attendance and involvement were not always equal across all members, these channels still helped the team coordinate fixes and final testing during the final stage of the project.

Another positive point was that members continued taking ownership of their own branches and feature areas. Nigel, Ken, and Ivan continued working on their branches, while Kelvin handled much of the GitHub integration and evidence tracing. Members were generally willing to fix bugs when they found them, which helped the team respond to late-stage issues in areas such as damage reports, notifications, role selection, mobile UI, and checkout/return behaviour.

Build/test checks and manual workflow testing were also conducted before preparing the final review. This gave the team a stronger basis for saying that the Sprint 4 increment was internally ready for final demonstration, even though formal client validation was still pending.

## 4.2 What Did Not Go Well

Several process-related challenges affected the pace and quality of Sprint 4. These challenges did not stop the team from completing the internal final increment, but they created pressure and reduced the time available for review. The table below summarises the main process challenges, the reasons behind them, and their impact on the sprint.

| Process challenge | Reason / root cause | Impact on Sprint 4 |
|---|---|---|
| Late-stage integration pressure | Many branch merges and fixes were concentrated around 24-26 May 2026. Different members worked on separate branches and feature areas, including AI, UI, notifications, admin/staff fixes, profile/role fixes, and damage report fixes. | The team had to spend extra time checking consistency and resolving issues after integration. This compressed the final testing window and increased the risk of last-minute fixes. |
| GitHub integration responsibility concentrated mainly on one person | Kelvin was the main person responsible for GitHub integration, merge checking, and evidence tracing. The team relied heavily on one GitHub owner instead of distributing this responsibility earlier. | Multiple branches, commit records, screenshots, and report evidence depended on one person to organise. This created a bottleneck near the deadline. |
| Cross-layer task complexity | Some tasks looked small at planning time but affected multiple layers. Damage reports involved UI, staff review, action logic, notifications, database migrations, and resolution handling. Holds and pickup expiry also involved workflow logic, notifications, database changes, and UI feedback. | Estimation and testing became harder because a change in one layer could create follow-up work in another layer. |
| Coding and report preparation happened in parallel | Evidence collection, screenshot planning, testing notes, contribution details, and final report content were not prepared early enough. | Development work and documentation work happened at the same time near the deadline, creating time pressure. |
| Client contact was not proactive enough | The team had not yet provided the final video, demo, or presentation to the client at the time of writing. The team also did not contact the client early enough to secure Sprint 4 feedback before the due date. | The team could only perform internal validation. Formal client feedback and client approval remained pending. |
| Uneven technical experience across the team | Different members were comfortable with different parts of the system. Some members could work independently, while some changes needed additional checking after merge. | The final sprint had less time available for review and rework, so differences in experience increased integration pressure. |
| Unclear commit messages in some areas | Some Sprint 4 commits used short or unclear messages. Branch names and file changes still helped with tracing, but the commit titles were not always descriptive. | Contribution tracking and report evidence preparation became less efficient. |

## 4.3 What Can Be Improved

Although the project is now ending, these improvements would have made Sprint 4 smoother and are useful lessons for similar future projects.

| Improvement area | Suggested improvement | Reason |
|---|---|---|
| Branch merging | Merge branches earlier and more frequently instead of waiting until the final few days. | Earlier integration would expose conflicts and bugs sooner, while there is still time to fix them calmly. |
| GitHub responsibility | Share GitHub integration, merge checking, and evidence collection with at least one additional member. | This would reduce bottlenecks and avoid placing too much final delivery risk on one person. |
| Evidence collection | Collect screenshots, test result evidence, commit references, and contribution notes throughout the sprint. | Report preparation would be less rushed if evidence was collected while work was being completed. |
| Client validation | Prepare the final demo or progress video earlier and contact the client earlier. | Even if the client replies slowly, earlier contact increases the chance of receiving feedback before the report due date. |
| Commit discipline | Use clearer commit messages with a consistent format such as `feat:`, `fix:`, `test:`, `docs:`, or `refactor:`. | Clearer commit messages make Sprint Review and Contribution Details easier to prepare and verify. |

## 4.4 Action Items to Be Done

Even though the project is at the final stage, the following actions are still useful for completing the report and handover preparation.

| Action item | Owner | Target |
|---|---|---|
| Insert final screenshots for each Sprint Review backlog item | All members | Before report submission |
| Add build/test evidence screenshots if available | Kelvin | Before report submission |
| Finalise GitHub commit evidence for contribution details | Kelvin | Before report submission |
| Review each member's contribution section for accuracy | All members | Before report submission |
| Prepare final demo/video or handover material for the client | Scrum Masters / all members | As soon as possible |
| Clearly mark client feedback as pending if no response is received before the due date | Report editor | Before report submission |

## 4.5 General Observations from Sprint 4

Sprint 4 showed that the final sprint of a software project is not simply about finishing the last few features. A large amount of work is required for integration, testing, evidence collection, documentation, and final validation. Even when the system is mostly implemented, hidden issues can still appear when branches are merged or when workflows are tested end to end.

The team was able to complete the main planned workflow fixes and conduct internal build/test checks and manual testing. However, the sprint also showed that process discipline matters most near the end of a project. Late merging, uneven workload distribution, unclear commit messages, and delayed client contact all made the final stage more difficult.

The most important lesson from Sprint 4 is that final delivery work should start earlier. Technical completion, evidence collection, report writing, and client validation should not be treated as separate last-minute tasks. They need to be planned as part of the sprint from the beginning.
