# AGENTS.md

## Project Overview

- **Project:** Explain2Win — a learning-by-teaching app where users record explanations, receive AI feedback and quizzes, and build mastery over repeated study sessions.
- **Target user:** Students and self-directed learners who want to improve understanding through verbal explanation and assessment.
- **My skill level:** Intermediate — explain unfamiliar project-specific decisions plainly while keeping technical details accurate.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, tRPC, React Query, Prisma/PostgreSQL, Auth.js, Google Gemini, AWS S3, and Stripe.

## Repository Map

- `src/app` contains App Router pages, layouts, and HTTP handlers; `src/server/api` contains tRPC routers.
- `src/server/ai`, `src/server/storage`, and `src/server/auth` contain Gemini, S3, and Auth.js integrations.
- `src/components`, `src/hooks`, and `src/lib` contain UI, client workflows, constants, and shared utilities.
- `prisma/schema.prisma` is the data-model source of truth; `README.md` documents architecture and known gaps.

## Commands

- **Install:** `pnpm install`
- **Dev:** `pnpm dev`
- **Build:** `pnpm build`
- **Test:** `pnpm test` (Vitest is configured, but the repository currently has no test files)
- **Lint:** `pnpm lint` (currently has pre-existing lint failures)
- **Typecheck:** `pnpm typecheck`
- **Format check:** `pnpm format:check`
- **Database:** `pnpm db:generate`, then `pnpm db:push` for an explicitly approved local/test database

## Do

- Read existing code and its callers before modifying anything. Because `.codegraph/` exists, use `codegraph explore` or `codegraph node` before broad file searches.
- Match existing TypeScript, Next.js App Router, tRPC, Prisma, component, naming, and styling patterns.
- Keep user-data operations behind `protectedProcedure` or authenticated route handlers, and verify resource ownership on the server.
- Validate external input with Zod or explicit file validation; handle AI, S3, Stripe, and database errors clearly.
- Keep related database writes atomic. Update credit balances and append their `CreditUsage` records in the same transaction.
- Preserve core invariants: one quiz per explanation, retry-safe mutations, and server-enforced mastery transitions.
- Keep changes small and scoped to what was asked. Preserve unrelated work in the worktree.
- Run checks proportional to the change. At minimum, format/lint touched files and run `pnpm typecheck` for code changes.
- Update `README.md` and `.env.example` when commands, configuration, routes, or required environment variables change.

## Don't

- Install new dependencies without asking.
- Delete or overwrite files, data, S3 objects, or migrations without confirming the exact scope.
- Read, expose, hardcode, or commit secrets from `.env`; use `.env.example` for configuration reference.
- Import Prisma, Gemini, Stripe, S3, or other server-only code into Client Components.
- Trust client-side authorization or accept resource IDs without checking ownership and relationships.
- Copy known authorization gaps from `quiz.submitAnswer`, `quiz.getQuestions`, or `knowledgeGraph.createEdges` into new code.
- Run `db:push`, migrations, Prisma Studio, the knowledge-graph backfill, paid APIs in bulk, or operations against an unconfirmed database.
- Rewrite working code, run repository-wide autofixes/formatting, or change AI models/prompts unless explicitly required.
- Commit, push, deploy, rebase, reset, or force-push without permission.
- Make changes outside the scope of the request.

## When Stuck

- If a task is large, break it into clear steps and state any important assumptions before proceeding.
- Search CodeGraph, source, `README.md`, `package.json`, and `prisma/schema.prisma` before guessing.
- If the same approach fails twice, stop repeating it, explain the evidence and blocker, and try a safer alternative or ask for direction.

## Testing

- Run targeted tests after changes and add focused Vitest coverage for new business logic when practical.
- Prioritize tests for authorization, duplicate submissions, credit accounting, mastery transitions, and AI-output parsing.
- The repository currently has no test files or Playwright configuration; do not claim those suites pass.
- Run `pnpm typecheck`; run `pnpm build` for release-sensitive or cross-cutting changes.
- Do not skip, weaken, or delete tests and checks merely to make a change pass.
- Report pre-existing lint failures separately from regressions in touched code.

## Definition of Done

- The requested behavior is complete without unrelated changes.
- Authorization, validation, ownership, idempotency, and data-integrity effects were reviewed where relevant.
- Touched files pass targeted format/lint checks, and code changes pass `pnpm typecheck`.
- The final response lists changed files, checks run, failures or skipped checks, and remaining risks.

## Git

- Check `git status` before and after editing, and preserve unrelated user changes.
- Keep commits small and focused with descriptive messages when the user asks for a commit.
- Never edit `pnpm-lock.yaml` manually, bypass hooks, or force-push.

## Response Style

- Always respond with clear, concise messages.
- Use plain English when explaining work to the user.
- Lead with the outcome, then list changed files, verification results, and remaining risks.
- Avoid long sentences, unnecessary jargon, and large unstructured paragraphs.
