# REPORECODE — ULTIMATE CONSOLIDATED MASTER DEVELOPMENT PROMPT

## COMPLETE DEVELOPMENT SPECIFICATION — FUNCTIONALITY, ARCHITECTURE, CODING PET, UI/UX, THEMES, SECURITY, DEPLOYMENT & OPEN SOURCE

### IMPORTANT: CONTINUE THE EXISTING PROJECT

You are continuing development of **RepoRecode**, an open-source project-based programming learning platform.

This document combines and supersedes previous instructions, including:

- The original RepoRecode master development specification.
- Mandatory development priorities.
- Simplified backend and free-services requirements.
- Local installation and hosted website support.
- Optional authentication and progress synchronization.
- Progress Export/Import.
- Feedback collection and maintainer analytics.
- The customizable, non-AI Coding Pet.
- Modern frontend animation and UI libraries.
- Expanded application color themes.
- Final testing, deployment, and documentation requirements.

**Treat this as the single authoritative product specification.**

Resolve conflicts in older prompts using the instructions in this document.

Do not restart development unnecessarily.

Do not discard existing working code.

Do not replace functional features with mockups.

Inspect and modify the actual existing source files.

---

# PART 1 — PRODUCT IDENTITY AND PURPOSE

## 1. Project Name

**RepoRecode**

### Tagline

**Learn it. Recode it. Master it.**

### Mission

Build a free, professional, open-source platform that helps developers understand and master the actual code inside projects they have built, including applications generated with AI coding tools.

Many developers can create applications using AI but struggle to:

- Explain their code.
- Understand unfamiliar syntax.
- Identify what functions do.
- Understand component relationships.
- Debug their applications.
- Modify existing functionality.
- Rebuild important features independently.
- Answer technical interview questions about their own projects.

RepoRecode solves this by converting imported codebases into personalized, interactive programming lessons.

### Primary learning workflow

**Import Project → Analyze Code → Generate Roadmap → Explain Source → Practice Rewriting → Verify Correctness → Understand Technical Flow → Master the Project.**

This experience must be technically accurate, useful, and genuinely functional.

---

# PART 2 — MANDATORY DEVELOPMENT PRIORITIES

## 2. Functionality Comes First

Implement and stabilize features in this general order:

1. Secure repository and project importing.
2. AST analysis, symbol resolution, and dependency mapping.
3. Personalized learning roadmap.
4. Source-grounded code explanations.
5. Hide-and-rewrite coding exercises.
6. Syntax, type, and test-based practice evaluation.
7. Monaco editor and supported live preview.
8. Inspect-style source navigation and technical-flow diagrams.
9. Local progress persistence and Export/Import.
10. Hosted demonstration and local installation.
11. Optional GitHub authentication.
12. Feedback and lightweight analytics.
13. Coding Pet customization and reactions.
14. Advanced frontend design, animations, and themes.
15. Final verification, deployment, documentation, and release.

Security is required throughout every stage, not only at the end.

Establish a clean, functional UI early, but do not prioritize decorative animations ahead of broken learning functionality.

**Premium UI is an approved requirement, not an excuse to neglect the core product.**

---

# PART 3 — CURRENT DEVELOPMENT AND SOURCE-CODE CONTINUITY

## 3. Inspect Existing Work

Before coding:

1. Locate the actual RepoRecode project.
2. Identify its repository and working directory.
3. Inspect current source files.
4. Inspect existing functionality.
5. Inspect package dependencies.
6. Inspect previous tests.
7. Identify unfinished features.
8. Read saved development checkpoints.
9. Check for uncommitted changes.
10. Preserve all verified working code.

If the accessible project is an isolated prototype rather than the original Astra/Work application, disclose that distinction.

Do not claim to have changed a different application.

Do not overwrite changes being made concurrently in another development session.

### Existing prototype history

RepoRecode has previously had standalone prototype checkpoints containing implementations of:

- JavaScript/TypeScript source analysis.
- Function and import detection.
- Source mappings.
- Dependency graphs.
- Basic learning roadmaps.
- Code reconstruction.
- Restricted code evaluation.
- ZIP importing.
- Symbol relationships.
- IndexedDB progress saving.
- Progress Export/Import.

These are historical checkpoint descriptions, not proof of the present application's state.

Inspect actual files and tests before deciding what to reuse.

---

# PART 4 — ONE CODEBASE, TWO WAYS TO USE IT

## 4. Hosted Website

Create a publicly accessible RepoRecode website.

Visitors should be able to try the project without installing anything.

Requirements:

- No mandatory registration.
- Import supported public GitHub repositories.
- Import supported ZIP files and local folders.
- Analyze actual code.
- Follow a learning roadmap.
- Read code explanations.
- Practice rewriting code.
- View verified exercise feedback.
- Explore technical-flow diagrams.
- Use the supported live preview.
- Save progress in the browser.
- Export and import progress.
- Customize their theme and Coding Pet.
- Submit feedback.

Prefer browser-side processing when appropriate.

Avoid requiring expensive hosted computation.

## 5. Local Installation

Anyone should be able to clone the GitHub repository and run RepoRecode locally.

Requirements:

- No required cloud account.
- No mandatory Supabase connection.
- No mandatory paid services.
- No requirement to authenticate merely to begin learning.
- Local source analysis.
- Local coding practice.
- Local progress persistence.
- Full supported lesson functionality.
- Optional local AI integration.
- Optional GitHub account connection.
- Optional feedback submission.
- Clear installation instructions.

The locally installed version should continue functioning when offline for core supported features.

Online services should be optional enhancements.

Both modes must share the same core analysis and learning implementation.

---

# PART 5 — SIMPLE, FREE ARCHITECTURE

## 6. Recommended Technical Architecture

Prefer a maintainable implementation using:

### Frontend

- React.
- TypeScript.
- Existing compatible project framework.
- Tailwind CSS where appropriate.
- Monaco Editor.
- React Flow.
- IndexedDB.

### Backend

- Existing lightweight Node.js server.
- Typed API contracts where suitable.
- Simple persistence interfaces.
- SQLite where durable local storage is needed.

### Code Intelligence

- TypeScript Compiler API.
- ts-morph where beneficial.
- Tree-sitter when justified.
- Real dependency resolution.
- Structured source mappings.

### Optional Local AI

- Ollama or another suitable free local model runtime.
- Configurable and optional.
- No mandatory paid AI API.

### Hosted Services

Use free static hosting and minimal serverless functionality where practical.

A managed free-tier database may support optional account features, feedback, or synchronization.

Do not make hosted dependencies mandatory for local installations.

## 7. Avoid Unnecessary Infrastructure

Do not introduce:

- Kubernetes.
- Redis without a demonstrated need.
- Multiple microservices without justification.
- Large distributed worker systems.
- Expensive cloud sandboxes.
- Paid observability platforms.
- Paid voice services.
- Excessive backend abstractions.
- Complex real-time infrastructure.

Favor a clear, understandable architecture that open-source contributors can maintain.

---

# PART 6 — STRICTLY FREE DEVELOPMENT

## 8. Zero-Paid Dependency Requirement

The application must not require paid subscriptions or APIs to perform its supported core functions.

Use:

- Open-source libraries.
- Free developer tools.
- Local execution.
- Local AI when feasible.
- Genuinely usable free-tier hosting.
- Free database options within documented limits.

Do not:

- Purchase subscriptions.
- Enable billable services.
- Add payment methods.
- Enable paid overages.
- Consume temporary trial credits that could become billable without approval.
- Make paid AI, TTS, or execution API calls.
- Introduce hidden costs.

Free tiers are not unlimited.

Clearly document quotas, restrictions, and offline alternatives.

If a provider cannot guarantee a hard spending limit, avoid relying on it for unattended operations.

---

# PART 7 — REPOSITORY IMPORTING

## 9. Supported Import Methods

Implement:

1. Public GitHub repository URL.
2. Authorized GitHub repository selection.
3. Authorized private GitHub repositories.
4. Local ZIP upload.
5. Local folder import where supported.

An optional future VS Code extension may be documented but is not required for initial completion.

## 10. Import Security

Validate all imported content.

Protect against:

- ZIP path traversal.
- Decompression bombs.
- Oversized files.
- Duplicate paths.
- Unsupported file formats.
- Symbolic-link escapes.
- Malicious dependency scripts.
- Untrusted repository instructions.
- Secret leakage.

Never execute untrusted imported code automatically on the production server.

Do not modify the user's original repository.

Use isolated working copies when necessary.

---

# PART 8 — REAL CODEBASE ANALYSIS

## 11. Source-Code Intelligence

Analyze:

- Project structure.
- Languages.
- Frameworks.
- Package dependencies.
- Entry points.
- Functions.
- Classes.
- Methods.
- Variables.
- Interfaces.
- Types.
- React components.
- Props.
- Hooks.
- State.
- Imports and exports.
- Routes.
- Events.
- API requests.
- Backend relationships.
- Database interactions.
- Relevant tests.

Build a verified dependency and symbol graph.

## 12. AST and Symbol Resolution

Use actual parser and compiler capabilities.

Correctly identify:

- Function definitions.
- Function calls.
- Imported symbols.
- Reexports.
- Aliases.
- Variable scopes.
- Shadowed identifiers.
- File dependencies.
- Component relationships.

Retain precise file, line, and source-range references.

Separate verified facts from approximations.

Do not fabricate relationships where static analysis cannot establish them.

---

# PART 9 — PERSONALIZED LEARNING ROADMAP

## 13. Roadmap Generation

Convert the imported project into a logical learning sequence.

Teach prerequisites before advanced project concepts.

Examples:

- Programming fundamentals.
- Variables.
- Functions.
- JavaScript syntax.
- TypeScript types.
- JSX.
- React components.
- Props.
- State.
- Hooks.
- Event handling.
- Routing.
- API requests.
- Databases.
- Authentication.
- Error handling.
- Testing.
- Architecture.
- Deployment.

Only include concepts relevant to the project or necessary prerequisites.

Connect each lesson to real source code.

The roadmap should display:

- Lesson title.
- Required concepts.
- Relevant file/function.
- Learning objective.
- Practice exercise.
- Completion state.
- Mastery level.

---

# PART 10 — DETAILED CODE EXPLANATIONS

## 14. Explain Actual User Code

Users must be able to learn:

- What each function does.
- Why it exists.
- What its syntax means.
- What inputs it accepts.
- What it returns.
- How it is called.
- What other functions it depends on.
- How it affects the application.
- What happens when it runs.
- Common mistakes.
- Relevant programming fundamentals.

Explain unfamiliar terms clearly.

Allow users to select meaningful source blocks and inspect their relationships.

Where appropriate, explain code line by line without generating excessive repetitive text.

## 15. AI Explanation Availability

The core platform must remain useful without paid AI.

Provide deterministic source-grounded explanations where possible.

Optional Ollama integration may generate richer explanations.

If local AI is unavailable, the system must still work.

Clearly distinguish:

- Verified code facts.
- Generated educational explanations.
- Model inferences.
- Unsupported analysis.

Do not invent functionality.

---

# PART 11 — INTERACTIVE PRACTICE ENGINE

## 16. Hide and Rewrite

After learning a code block, users should click **Practice**.

The selected original code is hidden.

The user must reconstruct it inside an editor.

Support:

- Writing code.
- Syntax validation.
- Type checking where appropriate.
- Running supported tests.
- Error feedback.
- Hints.
- Retry.
- Reset.
- Solution review after completion.

## 17. Exercise Types

Include:

- Function reconstruction.
- Missing-code completion.
- Output prediction.
- Bug fixing.
- Code modification.
- Refactoring.
- Component reconstruction.
- Project-specific challenges.
- Interview-style explanations.

## 18. Correctness Evaluation

Do not rely exclusively on exact text matching.

Use deterministic validation and test-based evaluation where supported.

Accept behaviorally equivalent implementations when allowed by the exercise.

Validate generated tests against known-good implementations.

Do not falsely report that a solution is universally correct because it passed a limited sample of tests.

For unsafe or unsupported JavaScript constructs, provide clear limitations.

---

# PART 12 — PROFESSIONAL CODING WORKSPACE

## 19. Required Layout

Use a resizable, developer-oriented workspace.

### LEFT SIDE

- Supported live application preview.
- Preview/Technical Flow toggle.
- Interactive source-linked diagrams.
- Element inspection where available.

### RIGHT SIDE

- Current lesson.
- Source explanations.
- Monaco editor.
- Practice exercises.
- Errors.
- Hints.
- Test feedback.
- Progress.

This layout is a core requirement.

## 20. Live Preview

Support real preview execution for compatible frontend projects.

Changes should update the preview when safely supported.

On failure:

- Display the real error.
- Highlight relevant lines.
- Preserve the last valid preview where possible.

Do not claim universal framework support.

Do not execute arbitrary uploaded Node.js applications directly on the hosted application server.

Use safe browser-based execution or a properly isolated environment when required.

## 21. Inspect-Style Navigation

When supported by source mapping:

- Click a rendered element.
- Highlight the corresponding component.
- Navigate to its source.
- Explain relevant code.
- Show relationships to other functions.

Support source-to-preview navigation where feasible.

Do not fabricate DOM-to-source mappings.

## 22. Technical Flow

Provide a toggle:

**Live Preview ↔ Technical Flow**

Use React Flow for verified relationships.

Visualize:

- Component hierarchies.
- Function calls.
- Data flow.
- State updates.
- Event handling.
- Routing.
- API relationships.

Make nodes interactive.

Allow source navigation.

Clearly indicate inferred relationships when they cannot be verified.

---

# PART 13 — PROGRESS SAVING

## 23. Guest Progress

No account should be required.

Store supported progress in IndexedDB.

Examples:

- Project identifiers.
- Completed lessons.
- Scores.
- XP.
- Achievements.
- Preferences.
- Timestamps.

Do not upload source code automatically.

## 24. Export Progress

Provide a real **Export Progress** button.

Generate a versioned JSON backup.

Include only required learning data.

Exclude secrets and private authentication information.

## 25. Import Progress

Provide a real **Import Progress** button.

Validate the file and schema.

Safely merge progress.

Handle duplicates, version differences, and project mismatches.

Do not erase existing progress without appropriate confirmation.

Support moving progress between the hosted website and local installations.

---

# PART 14 — OPTIONAL AUTHENTICATION AND SYNC

## 26. Optional GitHub Login

Users may:

- Continue without login.
- Connect GitHub.
- Select authorized repositories.
- Access properly authorized private repositories.
- Use optional account-linked features.

GitHub authentication must not be required for public repository URLs or local project importing.

Use least-privilege permissions.

## 27. Optional Cloud Synchronization

Once the core application works reliably, implement lightweight optional account-based progress synchronization if feasible within free service limits.

Users signed into both hosted and local installations may synchronize progress when connected.

Handle:

- Guest-to-account migration.
- Conflict resolution.
- Duplicate progress.
- Project revisions.
- Offline changes.
- Sync status.

Local installations must remain usable without cloud synchronization.

If reliable synchronization significantly delays the first release, preserve Export/Import and document automatic sync as pending.

Do not claim it works until verified.

---

# PART 15 — FEEDBACK AND COMMUNITY

## 28. Feedback System

Build an integrated Feedback section.

Allow:

- Feature requests.
- Bug reports.
- General feedback.
- Optional rating.
- Optional contact details.

Support anonymous submissions where practical.

Allow hosted and local users to submit feedback.

Local users need internet only when actually submitting feedback.

Do not transmit their repository contents or learning data without explicit consent.

Use validation, size limits, and spam protection.

## 29. Lightweight Admin Dashboard

Create a secure maintainer dashboard for:

- Registered user counts.
- Active signed-in users.
- Submitted feedback.
- Average ratings.
- Feature requests.
- GitHub stars.
- Available clone statistics.
- Release downloads.
- Opt-in local installations.
- Opt-in anonymous activity.

Distinguish downloads from installations and unique users.

Do not build an unnecessarily complex infrastructure-monitoring system.

All admin functionality requires real server-side authorization.

---

# PART 16 — PRIVACY-FRIENDLY LOCAL ANALYTICS

## 30. Optional Telemetry

Local users must be able to use the application without telemetry.

Provide an optional, disabled-by-default consent setting for basic anonymous installation/activity metrics.

Do not collect:

- Source code.
- Private repository contents.
- Practice answers.
- Filesystem paths.
- Secret tokens.
- Sensitive personal data.

Document exactly what is transmitted.

Provide a way to revoke telemetry consent.

Never degrade functionality for users who decline.

---

# PART 17 — LIGHTWEIGHT CODING PET

## 31. Keep the Companion, Remove AI Tutoring

RepoRecode must retain the animated character at the bottom-left of the learning interface.

However, it is now a **Coding Pet**, not an AI tutor.

The pet:

- Reacts to actual learning events.
- Greets users when clicked.
- Celebrates successful exercises.
- Shows playful frustration after failed verification.
- Celebrates achievements.
- Performs subtle idle animations.

The pet does not:

- Explain code.
- Answer programming questions.
- Use paid AI APIs.
- Speak through TTS.
- Require STT.
- Need a language model.
- Send coding data to external services.

All educational explanations stay within the main learning system.

---

# PART 18 — BOY, GIRL AND ROBOT APPEARANCES

## 32. Fix Existing Character Differentiation

The current implementation reportedly makes Boy and Girl appear nearly identical.

**Inspect and fix this specific problem.**

Do not merely change the labels.

Create recognizably distinct default character designs.

### Boy Preset

Provide a distinct default character design with original:

- Hairstyle.
- Face details.
- Clothing silhouette.
- Hoodie/jacket/shirt options.
- Pants/shorts options.
- Shoes.
- Cap.
- Glasses.
- Accessories.

### Girl Preset

Provide a distinct default character design with original:

- Hairstyle.
- Face details.
- Clothing silhouette.
- Tops, jackets, dresses, skirts, or pants.
- Shoes.
- Hair accessories.
- Cap.
- Glasses.
- Accessories.

### Robot Preset

Provide a mechanical design with:

- Robot body.
- Digital eyes.
- Mechanical limbs.
- Antenna or headset options.
- Customizable metallic colors.
- Distinct animations.

Boy and Girl should not be distinguished only by pink and blue colors.

These are initial character presets, not restrictions on what users can wear or customize.

---

# PART 19 — CODING PET CUSTOMIZATION

## 33. Functional Appearance Customization

Allow users to change:

- Character type.
- Hairstyle or head style.
- Clothing.
- Accessories.
- Cap/hat.
- Glasses.
- Body or compatible skin colors.
- Character size.
- Display position where appropriate.

Each control must visibly change the actual rendered character.

Persist customization preferences.

Allow users to hide the pet.

Provide reduced-motion controls.

---

# PART 20 — CODING PET REACTIONS

## 34. Event-Driven Animation

Implement deterministic states such as:

- Idle.
- Greeting.
- Watching.
- Frustrated.
- Celebrating.
- Achievement.
- Hidden.

Trigger them using actual application events:

- Pet clicked.
- Practice started.
- Exercise failed.
- Exercise passed.
- Lesson completed.
- Achievement unlocked.

Do not treat incomplete typing as failure.

Only celebrate correctness after required validation passes.

Keep reactions lightweight and nonintrusive.

Use CSS, SVG, sprites, or an appropriately licensed free animation engine.

No AI model is required for pet reactions.

---

# PART 21 — PREMIUM MODERN FRONTEND

## 35. Visual Quality Is an Explicit Requirement

RepoRecode should look like a polished modern developer tool with tasteful game-inspired details.

The product must not look like a generic AI-generated SaaS template.

It should feature:

- High-quality typography.
- Clean spacing.
- Original visual identity.
- Professional navigation.
- Responsive layouts.
- Refined components.
- Smooth transitions.
- Attractive project cards.
- Interactive learning roadmap.
- Well-designed achievement states.
- Cohesive themes.
- A visually distinctive Coding Pet.

Keep the programming workspace uncluttered.

---

# PART 22 — APPROVED FRONTEND TOOLS

## 36. React Bits

Official website: https://reactbits.dev/

Use suitable free components for:

- Landing-page typography.
- Animated headings.
- Cards.
- Hover effects.
- Navigation.
- Progress feedback.
- Achievement displays.
- Subtle decorative backgrounds.

Do not install the entire library.

Selectively review and integrate useful components.

## 37. Motion for React

Official website: https://motion.dev/

Use for:

- Page transitions.
- Modal animations.
- Interactive tabs.
- Dashboard transitions.
- Hover feedback.
- Lesson-card interactions.
- Progress changes.
- Component entrance/exit animations.

## 38. GSAP

Official website: https://gsap.com/

Use selectively for advanced sequences such as:

- Landing-page introductions.
- SVG animations.
- Achievement celebration timelines.
- Orchestrated feature reveals.

Do not duplicate ordinary Motion animations with GSAP.

Review license restrictions before use in the open-source project.

## 39. shadcn/ui

Official website: https://ui.shadcn.com/

Use accessible, customizable primitives for:

- Buttons.
- Dialogs.
- Menus.
- Tabs.
- Forms.
- Selectors.
- Notifications.
- Tooltips.
- Settings.

Customize their styling to create an original visual identity.

## 40. Tailwind CSS

Use for maintainable styling and responsive design where appropriate.

Do not rewrite a working existing styling system without justification.

## 41. Lucide Icons

Use a consistent icon system.

Avoid meaningless or inconsistent decorative icons.

## 42. Lenis

Use only where smooth scrolling meaningfully improves long-form public pages.

Do not interfere with:

- Monaco scrolling.
- Source navigation.
- Code selection.
- Preview interactions.
- Technical-flow canvases.
- Nested panels.

## 43. React Flow

Continue using React Flow for the technical-flow feature.

Enhance actual graph interactions and visual clarity without inventing dependencies.

## 44. Coding Pet Animation Tools

Use lightweight free tools appropriate to the existing character implementation.

Do not add unnecessary paid services or heavy runtimes.

---

# PART 23 — EXPANDED COLOR THEME SYSTEM

## 45. Fix the Current Three-Theme Limitation

The current interface reportedly contains only three themes.

Expand the theme system to **at least twelve complete palettes**.

Do not simply rename or slightly recolor the same three themes.

All presets must be meaningfully distinct.

## 46. Required Theme Presets

Implement:

1. **Codex Graphite** — Dark graphite, neutral grey, muted sage accents.
2. **Codex Paper** — Off-white, soft grey, understated professional accents.
3. **Claude Warm Light** — Cream, beige, terracotta, warm dark text.
4. **Claude Warm Dark** — Warm charcoal, brown-grey, copper highlights.
5. **Midnight Blue** — Navy, blue-grey, azure accents.
6. **Forest Terminal** — Dark forest green, mint, muted natural tones.
7. **Rosewood** — Burgundy, muted rose, elegant dark surfaces.
8. **Solar Sand** — Ivory, amber, warm brown.
9. **Violet Circuit** — Dark violet, slate, soft lavender.
10. **Ocean Glass** — Deep blue-grey, teal, aqua.
11. **Monochrome** — Black, white, grey.
12. **Cyber Crimson** — Dark charcoal, restrained coral/crimson.

Preserve useful existing themes as well.

Codex and Claude references describe visual inspiration only.

Create original RepoRecode palettes; do not copy protected brand assets or proprietary design code.

---

# PART 24 — GLOBAL THEME IMPLEMENTATION

## 47. Centralized Theme Architecture

Use semantic design tokens.

Each theme must define:

- Background.
- Foreground.
- Surface.
- Cards.
- Sidebar.
- Borders.
- Primary accent.
- Secondary accent.
- Muted text.
- Hover states.
- Selection states.
- Focus states.
- Success.
- Warning.
- Error.
- Progress indicators.
- Technical graph nodes.

Theme switching must update the entire RepoRecode interface consistently.

Do not scatter theme-specific hardcoded color values across unrelated components.

## 48. Theme Selector

Create an Appearance settings panel with:

- Theme names.
- Color swatches.
- Mini theme previews.
- Active-theme indicator.
- Immediate switching.
- Saved preference.
- Reset option.
- Optional system-theme matching.

Avoid page reloads.

## 49. Monaco Themes

Integrate selected palettes into Monaco where practical.

Update:

- Editor background.
- Syntax colors.
- Gutter.
- Line numbers.
- Current-line highlight.
- Selection colors.
- Error decorations.
- Warning decorations.

Maintain accessibility and readability.

**Never recolor the imported application's live preview when users change the RepoRecode theme.**

---

# PART 25 — ANIMATION PLACEMENT

## 50. Recommended Visual Improvements

### Landing Page

- Refined hero title animation.
- Subtle interactive background.
- Polished call-to-action controls.
- Animated explanation of the product workflow.

### Project Import

- Hover feedback.
- Upload progress.
- Analysis loading state.
- Import success/failure state.

### Learning Roadmap

- Smooth node transitions.
- Completed lesson indicators.
- Unlock animations.
- Interactive dependency paths.
- Clear progress indicators.

### Coding Workspace

- Smooth panel changes.
- Practice mode transitions.
- Validation feedback.
- Animated success states.

Do not animate the actual code editor while users type.

### Achievements

- XP progress.
- Lesson completion animation.
- Achievement reveal.
- Lightweight celebrations.

### Coding Pet

- Greeting.
- Idle.
- Frustration.
- Celebration.
- Achievement reaction.

Keep effects brief and meaningful.

---

# PART 26 — PERFORMANCE AND ACCESSIBILITY

## 51. Required Safeguards

All visual effects must respect:

- Reduced-motion preferences.
- Keyboard navigation.
- Accessible contrast.
- Mobile responsiveness.
- Text readability.
- Reasonable bundle size.
- Smooth editor interaction.
- Animation cleanup.
- Performance on low-end devices.

Do not install multiple libraries that unnecessarily duplicate the same function.

Prefer CSS for simple transitions, Motion for component interactions, and GSAP only when advanced timelines are justified.

Lazy-load decorative animations where appropriate.

Use correct cleanup for animations and event listeners.

Do not introduce continuous high-cost animation loops in the coding workspace.

---

# PART 27 — SECURITY

## 52. Security Is Mandatory Throughout Development

Protect against:

- SQL injection.
- XSS.
- CSRF.
- SSRF.
- Path traversal.
- ZIP bombs.
- Command injection.
- Broken access control.
- IDOR.
- OAuth vulnerabilities.
- Session abuse.
- Prompt injection from repository contents.
- Secret leakage.
- Unsafe code execution.
- Dependency attacks.
- Resource exhaustion.

All privileged operations must have server-side authorization.

Protect the maintainer dashboard.

Use rate limits and input validation.

Do not run untrusted imported code with unrestricted system access.

Provide a threat model and actual security test results.

---

# PART 28 — HOSTED DEMO LIMITS

## 53. Online Demonstration

The hosted version should be immediately usable.

Do not require login to begin.

A configurable limit of approximately three guided lessons may be used if hosted resource consumption makes it necessary.

However, if the relevant computation and storage are handled locally in the visitor's browser, avoid artificial lesson restrictions.

If a limit is enabled, display an explanation and provide a direct GitHub installation link.

Explain that users can Export Progress and Import it locally.

Only promise same-account automatic restoration if synchronization is actually implemented and verified.

The local version must not impose an arbitrary online-demo lesson cap.

---

# PART 29 — OPEN-SOURCE QUALITY

## 54. GitHub Repository

Prepare a professional repository including:

- README.
- LICENSE, selected with user approval.
- CONTRIBUTING.
- SECURITY.
- CODE_OF_CONDUCT.
- CHANGELOG.
- ROADMAP.
- `.env.example`.
- Installation instructions.
- Architecture documentation.
- API documentation.
- Testing instructions.
- Deployment instructions.
- Screenshots.
- Troubleshooting information.
- GitHub Actions CI.
- Issue and pull request templates.

Use actual screenshots.

Do not fabricate project popularity.

Do not require users to star the repository before using RepoRecode.

Make it straightforward for new developers to contribute.

---

# PART 30 — ACTUAL SOURCE-CODE MODIFICATION

## 55. Do Not Produce Only a Plan

Inspect the existing implementation and update relevant files.

Depending on the actual repository structure, this may include:

- React components.
- Application routes.
- Backend endpoints.
- Source analysis modules.
- Practice evaluation modules.
- Live preview implementation.
- Technical-flow components.
- Theme definitions.
- CSS variables.
- Monaco theme configuration.
- Appearance settings.
- Coding Pet components.
- Character artwork.
- Animation state.
- Progress persistence.
- Export/Import handlers.
- GitHub integration.
- Feedback forms.
- Analytics endpoints.
- Admin dashboard.
- Authentication.
- `package.json`.
- Lockfiles.
- Tests.
- Documentation.
- Deployment configuration.

Do not invent file paths.

Preserve existing functionality.

Delete obsolete dependencies only after verifying that they are unused.

Perform incremental changes.

Run regression tests after every significant milestone.

Do not modify unrelated projects.

---

# PART 31 — DELIVERY MILESTONES

## 56. Development Execution Sequence

### Milestone 1 — Existing Code Review

Locate actual source files and determine what is already implemented.

### Milestone 2 — Core Code Intelligence

Verify imports, AST analysis, source maps, and dependency graphs.

### Milestone 3 — Learning and Practice

Verify explanations, roadmaps, exercise generation, and correctness evaluation.

### Milestone 4 — Professional Coding Workspace

Complete Monaco, supported preview, Inspect navigation, and technical-flow diagrams.

### Milestone 5 — Progress Persistence

Complete local saving and robust Export/Import.

### Milestone 6 — UI Theme Expansion

Implement 12+ palettes and persistent switching.

### Milestone 7 — Premium UI Enhancements

Integrate selected React Bits, Motion, GSAP, and other appropriate frontend tools.

### Milestone 8 — Coding Pet

Fix Boy/Girl/Robot differences, customization, and event-driven reactions.

### Milestone 9 — Optional GitHub and Community Features

Implement optional authentication, feedback, basic analytics, and optional cloud sync where feasible.

### Milestone 10 — Production Readiness

Complete security checks, tests, local installation, hosted demonstration, documentation, and open-source preparation.

These are milestone priorities, not permission to postpone fixing critical security problems.

If earlier features are already implemented and verified, do not rebuild them unnecessarily.

Proceed to the next incomplete milestone.

---

# PART 32 — VERIFICATION AND ACCEPTANCE

## 57. Core Product Acceptance Criteria

Verify that a user can:

1. Open RepoRecode.
2. Continue without login.
3. Import a supported project.
4. Receive actual source analysis.
5. Explore functions and dependencies.
6. Follow a project-specific roadmap.
7. Read accurate code explanations.
8. Start a practice exercise.
9. Rewrite a hidden code block.
10. Receive real validation feedback.
11. Fix the code and pass tests.
12. Save progress.
13. Export progress.
14. Import progress.
15. Open the live preview for supported projects.
16. Explore verified technical-flow relationships.
17. Change application themes.
18. Customize the Coding Pet.
19. See meaningful pet reactions.
20. Submit optional feedback.

## 58. Frontend Acceptance Criteria

Verify:

- At least 12 distinct themes are implemented.
- Global theme switching works.
- Settings persist after refresh.
- Monaco is readable in every theme.
- Imported preview styling remains unchanged.
- Selected free frontend libraries are actually used.
- Effects respect reduced motion.
- Editor performance remains acceptable.
- Boy, Girl, and Robot are visibly distinct.
- Clothing, cap, glasses, and colors visibly change.
- Pet reactions use real application events.
- No paid companion API is required.

## 59. Infrastructure Acceptance Criteria

Verify:

- Local installation operates without mandatory Supabase.
- No paid API is required for core functions.
- Guest mode works.
- Source code remains private unless explicitly shared.
- Export/Import works without authentication.
- Cloud synchronization is optional.
- Admin features are properly protected.
- The hosted demonstration respects free-tier limits.

## 60. Testing

Run actual:

- Unit tests.
- Integration tests.
- API tests.
- Security checks.
- Source-analysis tests.
- Practice-evaluation tests.
- Progress persistence tests.
- Theme tests.
- Character customization tests.
- Accessibility checks.
- Build verification.
- Appropriate end-to-end tests.

Record actual results.

Never fabricate passing tests.

If a test environment cannot run a required test, report the limitation.

---

# PART 33 — AUTONOMOUS DEVELOPMENT

## 61. Minimize Unnecessary User Intervention

Make ordinary engineering decisions independently.

Continue through implementation milestones where the development environment and permissions allow.

Do not repeatedly ask for minor approvals.

Request input when necessary for:

- Permissions.
- Account authorization.
- Significant changes to user requirements.
- Irreversible operations.
- Legal decisions.
- Important security concerns.

Do not purchase services.

Do not expose secrets.

## 62. Preserve Checkpoints

Maintain:

- Current milestone.
- Completed changes.
- Modified files.
- Passing tests.
- Failed tests.
- Known issues.
- Pending features.
- Deployment status.
- Required approvals.
- Next actions.

Commit verified work to the authorized project repository when appropriate.

When interrupted, preserve enough information for development to resume.

Do not claim that a scheduled task can independently reopen a paused Astra/Work development session or reset model quotas.

---

# PART 34 — FINAL HANDOVER

## 63. Required Deliverables

Upon verified completion, provide:

1. Actual RepoRecode source repository.
2. Verified deployed website URL, if deployment succeeds.
3. Working local installation instructions.
4. Source ZIP archive.
5. Professional README.
6. Real screenshots.
7. Architecture diagrams.
8. Technology documentation.
9. Database and storage documentation.
10. API documentation.
11. Security documentation.
12. Test results.
13. Free-service and operating-cost summary.
14. Known limitations.
15. Future development roadmap.
16. Comprehensive PDF engineering report.
17. Editable DOCX engineering report.

The reports should cover architecture, implemented features, UI/UX, Coding Pet, progress persistence, authentication, feedback, security, testing, deployment, and ongoing maintenance.

If connected storage is authorized, save deliverables to the designated project workspace.

Only claim successful uploads and deployments after they have been verified.

---

# FINAL DIRECTIVE TO ASTRA

Build RepoRecode as a **free, practical, polished, open-source coding education platform**.

Its competitive advantage is not a large cloud infrastructure or an animated chatbot.

Its competitive advantage is helping people genuinely understand and master the code inside their own applications.

Preserve:

- Accurate code analysis.
- Personalized learning.
- Detailed explanations.
- Code reconstruction.
- Verified practice feedback.
- Monaco editor.
- Supported live preview.
- Interactive technical-flow diagrams.
- Progress tracking and Export/Import.
- Optional GitHub authentication.
- Feedback and basic analytics.
- Customizable Boy/Girl/Robot Coding Pet.
- Real reactions and celebrations.
- Professional visual design.
- 12+ selectable themes.
- Selectively integrated free React Bits, Motion, GSAP, shadcn/ui, and other suitable frontend tools.

Remove unnecessary paid services, AI tutoring from the pet, and overengineered cloud infrastructure.

Keep local installation independent and free.

Maintain security and performance.

**FUNCTIONALITY FIRST. SECURITY THROUGHOUT. VISUAL QUALITY WITHOUT DISTRACTION. ZERO MANDATORY PAID SERVICES.**

Most importantly:

**Do not simply acknowledge this prompt or generate another plan. Inspect the existing RepoRecode project, make the required changes in its actual files, preserve verified work, run tests, and continue developing the application toward a functioning release.**
