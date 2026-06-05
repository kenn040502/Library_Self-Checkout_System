# 6 Project Retrospect

This section reflects on the whole project, not only Sprint 4. It looks at how the team worked from Sprint 1 to Sprint 4, what improved over time, what problems remained, and what the team would do differently in a similar project. The reflection follows the required areas in the report template.

## 6.1 Project Management Approach

The team management approach improved across the project. In Sprint 1, the team mainly focused on improving the existing system from the previous semester, fixing early security issues, and adding AI-related features. In Sprint 2, the project became more complex because database naming, reservation logic, notifications, and AI tagging affected many parts of the codebase. In Sprint 3, the team started to pay more attention to UI consistency, documentation, GitHub workflow, and clearer feature ownership. By Sprint 4, the focus changed from adding more features to final testing, bug fixing, evidence collection, and handover preparation.

A good part of the project management approach was that the team became better at dividing work by feature area. Members generally worked on their own branches and were responsible for specific parts of the system. GitHub commits and branch history also helped the team track what had been completed and who contributed to each area.

However, planning was not consistent enough. Some tasks took longer than expected, especially tasks related to database changes, AI integration, UI fixes, and workflow logic. Some branches were merged late, and evidence for the report was also collected close to the deadline. In Sprint 4, this created pressure because coding, testing, merging, screenshots, and report writing were happening at the same time.

If the team repeated a similar project, integration, testing, screenshots, and reporting should be planned as part of each sprint instead of being treated as final tasks. The main lesson is that project management should track more than coding progress. It should also track testing, evidence collection, client contact, and report preparation from the beginning of each sprint.

## 6.2 Adherence to Ethical Standards

The project involved ethical concerns because the system handles user accounts, borrowing records, user roles, notifications, and AI responses. The team used Azure AD / NextAuth authentication, role-based access control, Supabase data storage, and server-side checks to protect user access and system data. The AI features were also improved later through prompt sanitisation, response validation, input limits, and safer handling of user context.

One positive part was that the team did not treat ethics as only a written requirement. Some ethical concerns were reflected in the actual technical work, such as protecting login access, checking user roles, limiting AI input, validating AI output, and avoiding unsupported claims in the report. The team also did not invent Sprint 4 client feedback when no formal feedback had been received.

The weaker part was that some ethical and security concerns were handled later than ideal. For example, AI safety, prompt control, data handling, and role permission checks needed several rounds of improvement during the project. This shows that the team cared about ethics, but some checks should have been planned earlier.

In a similar project, the team should list key ethical risks earlier, especially risks related to user data, AI output, and staff/admin permissions. These risks should then be connected to testing and acceptance criteria. The main lesson is that security, privacy, safe AI behaviour, and honest reporting should be checked throughout the project, not only near the end.

## 6.3 Requirement Engineering

Requirement engineering was important because the team had to balance the core library self-checkout functions with extra features such as AI recommendations, Learning Hub, notifications, and external learning resources. Over time, the team became clearer that the most important value of the system was the library circulation workflow: checkout, check-in, holds, notifications, damage reports, and staff/admin management.

The team handled some requirement changes well. Earlier plans around external learning resources and AI provider usage had to be reconsidered because of access limits, rate limits, and reliability issues. The team responded by using fallback behaviour, improving the AI implementation, refining notifications, and focusing Sprint 4 on making the system more stable.

At the same time, some requirements were not confirmed early enough with the client. For example, API access, final handover expectations, and the exact form of final feedback were not fully settled early in the project. This made it harder to know whether all final expectations had been met before the report deadline.

If the team repeated this process, important assumptions should be checked earlier, especially assumptions about API access, client priorities, and final handover requirements. The main lesson is that requirements should be checked with both technical evidence and stakeholder expectations. If a requirement depends on external access or client confirmation, it should be clarified early.

## 6.4 Plan and Design

The system design became more complete as the project progressed. The team moved from building separate features to building a web-based library system with student, staff, and admin workflows. The final system includes checkout and check-in, active loans, overdue handling, hold placement, copy management, damage reports, notifications, profile management, admin user management, Learning Hub features, and Reading Assistant functionality.

The team improved the design when earlier versions were not good enough. The UI became more consistent across dashboard pages, mobile layouts, navigation, FAQ pages, and learning-related pages. The AI design also became stronger after the team moved toward DeepSeek integration, streaming responses, schema validation, and prompt sanitisation.

The main issue was that the design direction changed several times during the project. Some extra features were added before the core circulation workflow was fully stable. This made the system more difficult to integrate and test because AI features, Learning Hub features, UI redesign, and notification logic all affected different parts of the system.

In a similar project, the team should separate core features and extra features more clearly. The checkout, check-in, holds, notifications, and staff/admin workflows should be stabilised first before adding too many enhancement features. The main lesson is that extra features are useful, but they should not make the core library workflow harder to finish and test.

## 6.5 Quality

Quality improved through build checks, automated tests, GitHub evidence, manual testing, and repeated bug fixing. Earlier sprints relied more on local testing and visual checking. Later sprints included stronger build and Jest checks, and Sprint 4 included build testing and manual workflow testing to support the final internal review.

A good part of the quality process was that the team continued to fix problems after features were implemented. GitHub history shows repeated improvements to checkout/check-in behaviour, quick return, notifications, damage reports, role selection, profile display, mobile UI, and Reading Assistant behaviour. This shows that the team did not only add features, but also spent time improving reliability.

The weaker part was that testing was sometimes reactive. Some problems were found after branches were merged, so fixes had to be made late. Some workflows also depended heavily on manual testing because they involved several steps and were difficult to fully cover with automated tests within the project timeframe.

If the team repeated the project, each backlog item should have clearer acceptance criteria before development starts. Testing evidence and screenshots should also be collected when each feature is completed, not only near the end. The main lesson is that quality should be planned together with the work, not checked only after the work is done.

## 6.6 Stakeholder Management

Stakeholder management involved communication with the supervisor and the client. The team used meetings, reports, and internal checking to keep track of progress. Supervisor-related communication helped the team keep the project work visible, while client-related communication was needed to check whether the final system met expectations. As the project continued, the team also realised that the final system needed to focus strongly on the main library circulation functions, not only on extra features.

The team did adjust its priorities when the project direction became clearer. By Sprint 4, the team focused more on final testing, bug fixing, evidence collection, and handover preparation. This helped the team prepare a more complete final increment.

The main problem was that the team did not contact the client early enough, especially near the final deadline. The team spent most of its time on coding, merging, testing, and report preparation, so the final client demo and feedback request were not arranged early. At the time of writing, the Sprint 4 increment had not yet been shown to the client through a final video, demo, or formal presentation, and no formal Sprint 4 client feedback had been received. Therefore, the team can only say that the system was ready for internal review, not that it had been approved by the client.

If the team repeated this process, it should set earlier internal deadlines for preparing the demo, contacting the client, and asking for feedback. Client communication should be treated as part of the project work, not something to do only after coding is nearly finished. The main lesson is that even if the system works internally, the client still needs enough time to review it and give feedback.

## 6.7 Team Process

The team process had both strong and weak points. Members worked through different branches and feature areas, and the final system includes contributions across UI, backend logic, database changes, AI features, notifications, staff/admin workflows, and testing. WhatsApp and Microsoft Teams were used for communication, while GitHub provided the main technical record of progress.

The team worked well when members were able to focus on their assigned areas. Nigel, Ken, and Ivan worked on their own branches and feature areas, while Kelvin handled a large amount of integration, technical checking, and evidence tracing. The team also helped with final testing and bug fixing when issues were found.

However, work responsibility was not always balanced. Kelvin became the main GitHub and integration owner, which created a bottleneck near the end. Team members also had different technical skill levels, so some work needed extra checking after merge. Communication existed through WhatsApp and Teams, but the team was not always equally proactive, especially in client contact and early evidence preparation.

If the team repeated the project, integration, testing, evidence collection, and client communication should be shared more clearly across the team. The team should not depend too much on one person for GitHub management and final checking. The main lesson is that each member can own a feature, but final integration, testing, reporting evidence, and client communication should be planned as team responsibilities.

## 6.8 Overall Takeaway

Overall, the project was successful in producing a functional Library Self-Checkout System that was internally tested and prepared for final client review once the demo is arranged. The system includes student, staff, and admin workflows, and the team improved many parts of the system over several sprints.

The strongest parts of the project were the team's technical persistence, feature ownership, and willingness to fix problems after they were found. The weaker parts were late integration, uneven responsibility, late evidence collection, and not contacting the client early enough for final feedback.

The final lesson is that a project like this needs early planning for both technical work and project evidence. Coding, testing, screenshots, report writing, and client communication should all be planned throughout the sprint, not left until the final deadline.

The summary below gives a quick view of the main reflection points across the required areas.

| Area | What Went Well | What Was Not So Good | Key Lesson |
|---|---|---|---|
| Project management approach | Work became clearer through feature ownership and GitHub tracking. | Planning, merging, testing, and evidence collection were sometimes left too late. | Plan integration, testing, screenshots, and reporting from the start of each sprint. |
| Adherence to ethical standards | Authentication, role checks, safer AI handling, and honest reporting were considered. | Some AI, data, and permission checks were improved later than ideal. | Ethical risks should be listed and checked early. |
| Requirement engineering | The team adjusted requirements when technical limits appeared. | Some client expectations and external access assumptions were not confirmed early enough. | Confirm key assumptions with technical evidence and stakeholder input. |
| Plan and design | The system became more complete and the UI became more consistent. | Extra features made the core workflow harder to integrate and test. | Stabilise core library functions before adding too many enhancements. |
| Quality | The team used build checks, tests, manual testing, and repeated bug fixing. | Testing was sometimes reactive after branches were merged. | Link each backlog item to clear test evidence before marking it complete. |
| Stakeholder management | The team adjusted priorities toward final testing, evidence, and handover preparation. | The client was not contacted early enough for final demo and feedback. | Treat client communication as planned project work. |
| Team process | Members worked on their own branches and helped with final testing and bug fixing. | GitHub integration and final checking depended too much on one person. | Share integration, testing, evidence collection, and client communication across the team. |
