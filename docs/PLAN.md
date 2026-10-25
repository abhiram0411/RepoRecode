# Current plan

Updated 25 October 2026. Vercel Hobby is live at https://repo-recode.vercel.app from d826327; its GitHub CI passed. Supabase Free/GitHub sign-in and approved single-account sample cloud save/restore/delete passed. The owner deferred the two-account test. Do not recreate services or rerun applied migrations.

Provider availability changes were pushed as 605766f without deployment. CI passed 333 tests/build but stopped on the Zod security advisory. The next batch patches Zod to 4.6.6 and makes account-deletion availability truthful. Local audit is clear, 339 tests and build passed; all 35 Edge browser journeys also passed. Finish GitHub CI before considering a batched release.

Next: free durable backend design/implementation for anonymous feedback, administration and cloud account deletion; private GitHub App acceptance; remaining learning/indexing/preview work. Provider recovery/MFA/linking, cross-account checks and real PostgreSQL concurrency remain separate from local fixtures.

Continue the exact backlog in RESUME.md, FEATURES.md and MASTER_SPEC.md. Keep zero spending, no tutor and no repeated deployments. Older Sites version 17 remains unchanged. Publish only reviewed files through tmp/github-v10, never the root Sites history.
