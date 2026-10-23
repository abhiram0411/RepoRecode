# Finish RepoRecode setup yourself

Updated 23 October 2026. Keep everything on Free/Hobby. Never enter a card, enable a paid trial, buy credits, or upgrade to finish this project.

## What is done

- The local app batch passed 327 automated tests, its production build, and five focused Edge journeys. The earlier feature batch also passed 34 Edge and 34 Firefox journeys. These are local results.
- Supabase **RepoRecode** exists on Free: https://supabase.com/dashboard/project/oppotpgwkhyzgidjuonc
- You completed the database password step. Migrations 001-006 succeeded. Six tables have row-level security and deny anonymous reads. Nine privileged functions deny browser execution. No real two-account acceptance has run.
- You approved Vercel's GitHub App access to RepoRecode. Vercel can now import the existing repository.
- Vercel build settings are in `vercel.json`; automatic Git deployments are disabled there.
- Existing public version 17 is still live: https://reporecode-learning-lab.milkyibex8.chatgpt.site/

## Exact stopping point

Vercel's import form is open for **repo-recode**, **Hobby**, **Vite**, root `./`. No Vercel project/deployment was submitted. Supabase Auth providers, production redirect URLs and frontend public settings are not configured. No service-role keys or passwords were copied into source.

GitHub main still contains commit `6f49133e23b837bcfbf5630c550a4070d05f8995`. The newer source is in your main local folder and staged as files in the separate checkout `tmp/github-v10`, but has not been committed or pushed. The main folder uses a different Sites Git history: **do not push that root history to GitHub**.

The dependency audit retry succeeded with **0 vulnerabilities** after the owner requested continuation. The initial approval-review failure did not change source or publish anything.

## 1. Publish the tested code batch

Open PowerShell in `C:\Users\ABHIRAM\Desktop\Repo Recode` and run:

```powershell
npm audit --audit-level=high
```

Stop if it reports high/critical vulnerabilities or cannot fetch an audit. Don't run `npm audit fix --force`; changes need review and fresh tests.

The staging copy contains the reviewed source batch and the latest setup notes. Review its file list and differences:

```powershell
git -C tmp/github-v10 status --short
git -C tmp/github-v10 diff --check
git -C tmp/github-v10 diff --stat
git -C tmp/github-v10 ls-remote https://github.com/abhiram0411/RepoRecode.git refs/heads/main
```

If the remote is no longer `6f49133e23b837bcfbf5630c550a4070d05f8995`, stop and reconcile the new changes before pushing. Check that no passwords, private keys or `.env` files appear in the file list. When the audit succeeds and the list is correct:

```powershell
git -C tmp/github-v10 add --all
git -C tmp/github-v10 commit -m "Add bounded generic and async practice, source diagrams, and deployment setup"
git -C tmp/github-v10 push https://github.com/abhiram0411/RepoRecode.git HEAD:main
```

Use your normal GitHub sign-in if prompted. Never force push. Check the new commit's run at https://github.com/abhiram0411/RepoRecode/actions and wait for it to pass. Earlier successful CI is not evidence for this new batch.

## 2. Connect the free frontend

1. Open https://vercel.com/new and import **abhiram0411/RepoRecode**. Use the existing import form if it is still open. Do not choose the URL-based duplicate-repository clone flow.
2. Keep the **Hobby** team, project name `repo-recode`, root `./`, preset **Vite**. Use Node **24.x**, install `npm ci --ignore-scripts`, build `npm run build`, output `dist`. These build commands are already in `vercel.json`; inspect the resolved settings. Do not add paid integrations.
3. In Supabase's project settings, find **API Keys** and copy only the **publishable** key. In Vercel's environment-variable form add `VITE_SUPABASE_URL` = `https://oppotpgwkhyzgidjuonc.supabase.co` and `VITE_SUPABASE_PUBLISHABLE_KEY` = that publishable key. Never use a service-role/secret key or database password. A publishable key is designed for the browser; the database policies provide access control.
4. Create the project and deploy the reviewed GitHub commit once. If the UI separates Create Project and Deploy, complete both. Keep automatic Git deployments disabled. Wait for **Ready**, then record the actual production URL and commit; don't guess the final domain.
5. Open that URL and test guest sample import, rewriting/grading, React preview, mobile layout and source download. A working homepage alone is insufficient.

## 3. Finish sign-in

1. Supabase → Authentication → URL Configuration: set **Site URL** and an allowed redirect to the exact Vercel production origin from step 2. Avoid wildcard preview URLs.
2. Supabase → Authentication → Sign In / Providers → GitHub: read the callback URL shown there.
3. GitHub → Settings → Developer settings → OAuth Apps: register an app named RepoRecode, with the Vercel origin as Homepage URL and Supabase's exact callback as Authorization callback URL. Enter its client ID and client secret only into Supabase's GitHub provider configuration, then enable/save. Keep the secret out of chat, GitHub source and Vercel `VITE_` fields. You must handle credential-generation steps yourself if continuing with the agent.
4. GitHub OAuth sign-in, Vercel's GitHub App and the app's optional private-repository GitHub App are three different integrations. Completing one does not complete the others. Google sign-in needs its own provider setup if you want it.
5. Keep email confirmation enabled. Supabase's default email service has restrictions; test delivery before advertising email sign-up/recovery. Do not buy SMTP or disable confirmation as a workaround.
6. Test GitHub login and return to the app, sign-out, cloud save/restore, preferences, recovery, MFA and account linking. With a second distinct test account, prove that it cannot read, overwrite or delete the first account's project/preferences through either the app or direct API requests. Catalog screenshots are not this acceptance test.

**Do not rerun migrations 001-006:** they are already applied. Their SQL-editor execution is not recorded in the CLI migration-history table. `supabase/verify.sql` contains read-only checks you can rerun safely.

## Work that still needs engineering or verification

The complete master specification is not finished. These are separate from pressing deployment buttons:

- A genuinely free, durable same-origin backend for anonymous hosted feedback, administration, account deletion and private GitHub imports. The current Node gateway works locally; it is not deployed by the static Vercel configuration. Its single-process file storage must not simply be copied into a serverless function.
- Generic functions, constrained/deeper input types, persistent indexing/watchers, broader indirect state/API relationships, and more preview dependencies/frameworks.
- Individual-device session inventory, real simultaneous PostgreSQL connection tests, and live private GitHub lifecycle acceptance.
- Manual accessibility/WebKit/low-end device checks, Docker execution, independent security review and operator contacts. Optional local Ollama remains unfinished; a paid AI tutor is not part of this project.

See `docs/RESUME.md`, `docs/FEATURES.md` and `docs/MASTER_SPEC.md` for the detailed implementation boundaries. The full source is preserved locally; no reset or cleanup is needed to resume.
