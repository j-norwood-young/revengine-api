# Changelog

Notable changes to the RevEngine API.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## v4.4.0 — 2026-07-02

### Added

- **Invoicing on orders** — `order_model.ts` gains `invoice_id` and `invoice_started_at`, assigned by a `pre('save')` hook. Retry chains (e.g. `failed` → `paid`) share one invoice until the order is paid or the chain exceeds a 21-day lifetime, after which a new invoice starts. Logic lives in `src/lib/invoice.ts` (`decideInvoice` / `buildInvoiceId`, pure and unit-tested); invoice keys are `<reader_id>-<MM>-<YYYY>-<uid>`.
- **`scripts/backfill-invoice-id.mongo.js`** — idempotent one-off backfill that recomputes `invoice_id` / `invoice_started_at` per reader (`./mongosh scripts/backfill-invoice-id.mongo.js`).
- **`tag` model** — reusable tags (`name`, `color`, `applicable_types` of `reader`/`article`, `description`) with unique name and compound `applicable_types`+`name` index.
- **AI configuration models** — `ai_providers`, `ai_prompt_templates`, and `ai_mcp_servers` (admin-managed) backing configurable AI providers, prompt templates, and MCP server registrations.
- **`article_model.ts`** — `ai` subdocument for AI-generated metadata (tags, sentiment, entities, user needs) with provenance (`provider_id`, `model`, `template_slug`, `tasks`, `generated_at`, `raw`), kept separate from human/source fields.
- **`order_model.ts`** — `status_message` field and a `reader_id`+`date_created` compound index.
- **`dev-up`** — local development bring-up script.

### Changed

- **`reader_model.ts`** — added `tag_id` (linked to `tag`, `map_to: "tag"`) and `tag_update`, plus a `tag_id` index.
- **`server.ts`** — model directory is now resolved from the server file location (`__dirname/../models`) instead of a cwd-relative `./dist/models`, and `MODEL_DIR` is set to match so JXP's `loadAllModels`/`generateLinks` don't load models twice (avoids `OverwriteModelError` from a stale legacy `./models`).
- **Tooling** — repo now pins `pnpm@11.8.0` via `packageManager` and adds a `pnpm-lock.yaml`; `.gitignore` updated to ignore `data`.

## v4.3.0 — 2026-06-11

### Added

- **MCP (Model Context Protocol)** — read-only AI access via JXP 5 when `MCP_ENABLED=true` (endpoint `/mcp`, same port as the API). Uses the logged-in user's API key; permissions match REST `GET`.
- **`mcp/guide.md`** — RevEngine-specific MCP guide (reader, segment, large-collection safety, common workflows). Wired via `JXPConfig.mcp` in `server.ts`.
- **Docker** — `mcp/` directory copied into the production image so the project guide is available at runtime.

### Changed

- **JXP** — dependency bumped to `^5.0.0` (MCP server, `jxp-mcp` stdio bridge, LLM instructions + `jxp-guide` resource).

### Deploy notes

1. Publish **`jxp@5.0.0`** to npm first, then build/push this API image (`npm run docker:push`).
2. Set **`MCP_ENABLED=true`** in production env when you want `/mcp` exposed (off by default in JXP).
3. **`jxp-mcp`** is for local IDE use (Cursor/LM Studio stdio) — it is **not** run inside the API container. Point `npx jxp-mcp` at `JXP_URL` + `JXP_API_KEY`, or use direct HTTP MCP in Cursor.

---

## v4.2.3 — 2026-06-09

### Added

- **`ticket` model** — reader-linked event bookings (`event`, `event_date`, `booking_date`, `seats`, `value`, `vendor`, `payload`).
- **`reader_model.ts`** — payment and subscription tracking, engagement metrics (read depth, bounce rate, clickthrough rate, time on site), content preferences, reader habits (top times/days, newsletters), and additional demographic fields.
- **`article_model.ts`** — `wordcount` computed on save via a `pre('save')` hook (HTML stripped; logic in `src/lib/word-count.ts`).
- **`docs/article-wordcount-backfill.md`** — mongosh instructions for backfilling `wordcount` on existing articles.
- **`whitebeard_content_model.ts`** — `byline` field.

### Changed

- **`reader_model.ts`** — `user_registered` alias `user_registered_on_wordpress`; compound indexes for segment/subscription list queries and legacy production fields.
- **`server.ts`** — startup log includes MongoDB server version alongside Mongoose version.
- **JXP** — dependency bumped to `^4.2.0`.

### Removed

- **`apikey_model.ts`** and **`token_model.ts`** — removed; API keys and auth tokens are now provided by JXP built-in models.

---

## v4.2.0 — 2026-05-26

### Changed

- **JXP 4.2.0** — query limits: filtered large-collection lists use the default `?limit=100` without requiring an explicit limit; `?limit=` above max is capped (not 400); responses over 10 MiB return **413**.
- **`server.ts`** — `query_limits.max_response_size: "10mb"` (human-friendly size string).

### Migration

- Unfiltered `GET /api/<model>` on collections ≥10k documents still requires explicit `?limit=`.
- Use `?filter[...]` or POST `/query` with a non-empty `query` to list large collections without passing `?limit=`.
- Clients that sent `?limit=` above 1000 now receive a capped page (`limit_capped: true`) instead of HTTP 400.

---

## v4.1.2 — 2026-05-25

### Breaking changes

- **Labels are static** — `/call/label/apply_label` and `/call/label/apply_labels` no longer run rules, `fn`, or reader `label_id` updates. Both return a deprecation message: label application is unsupported; labels are now static.
- **Label save hook removed** — saving a label no longer triggers background application to readers.

### Changed

- **`label_model.ts`** — removed `applyLabel`, bulk reader updates, post-save hook, and unused dependencies (`jxp-helper`, `fix_query`, `simple-statistics`, etc.). Schema fields (`rules`, `fn`, `dirty`, counts) retained for existing documents.
- **E2E** — `test/e2e/label.test.mjs` expects deprecation warnings from apply endpoints instead of validation errors.

---

## v4.0.0 — 2026-05-19

Major release: TypeScript rewrite and upgrade to [JXP](https://github.com/WorkSpaceMan/jxp) 4.

Our release will now be in line with the JXP version.

### Breaking changes

- **TypeScript + build step** — application source lives under `src/` and compiles to `dist/`. Run `npm run build` before `npm start` or production deploys. Entry point is `dist/bin/server.js` (was `bin/server.js`).
- **JXP 4** — upgraded from JXP 2.x. Models must be compiled `*_model.js` files; server sets `model_dir: "./dist/models"` (paths resolve from `process.cwd()` in JXP 4).
- **JXP 4 security hardening** (from linked/published JXP 4.0.0):
  - List/query endpoints apply **`?limit=100`** when `limit` is omitted (collections ≥10,000 documents still require an explicit `?limit=`).
  - List responses omit **`count`** unless the client passes **`?count=true`** or **`?page=`**.
  - **`/call`** only exposes statics listed in **`callable_statics`** on each schema (see below).
  - **`GET /cache/stats`** and **`GET /cache/clear`** require **admin** credentials.
  - Dangerous filter operators (e.g. `$where`) are rejected; HTTP **`/bulkwrite`** is off unless a model opts in.
- **Mongoose 6.13.9** — aligned with JXP 4 pin (was 6.12.6).
- **Docker** — multi-stage image runs `tsc` at build time (`docker build -t revengine-api .`). Harbor pushes are versioned via `./docker-build` (tags `4.0.0`, `4.0.0-<git-sha>`, and `latest`).
- **Removed** — `SUPPRESS_NO_CONFIG_WARNING` (JXP 4 no longer uses the `config` package).

### Added

- **TypeScript** — `tsconfig.json`, `typescript`, `@types/node`, `@types/nodemailer`; all models, libs, and server bootstrap converted under `src/`.
- **Scripts** — `npm run build`, `npm run dev` (rebuild on `src/` changes via nodemon).
- **E2E tests** (Vitest) — `test/e2e/reader.test.mjs`, `segment.test.mjs`, `label.test.mjs` covering list endpoints (`?limit=` + `?count=true`), `/call/segment/*`, `/call/label/*`, API-key auth, and callable-static guards.
- **Test helpers** — `test/e2e/helpers/client.mjs` (`get` / `post`), `health.mjs` (API reachability check).
- **`callable_statics`** on models that use HTTP `/call`:
  - `segment` — `apply_segments`, `apply_segment`, `preview_segment`
  - `label` — `apply_label`, `apply_labels`
  - `mailrun` — `move_to_sent`, `move_to_failed`
- **JXP dev linking** — `npm run link:jxp` / `unlink:jxp` with shared mongoose peer symlinks (optional; overrides npm `jxp@^4` when `.use-local-jxp` is present).

### Changed

- **Layout** — `src/bin/server.ts`, `src/lib/`, `src/common/`, `src/models/` (41 models); root-level `bin/`, `lib/`, `common/`, `libs/`, `models/` removed.
- **Server** — uses `JXP(apiconfig)` instead of `new JXP(apiconfig)`; explicit `query_limits` (`default: 100`, `max: 1000`, `large_collection_threshold: 10000`).
- **E2E reader tests** — use `?count=true` when asserting totals; list-without-limit test accepts HTTP 200 with `limit: 100` (default) or HTTP 400 on very large collections.
- **Vitest** — `fileParallelism: false` for e2e so heavy `/call` jobs do not run in parallel against one API process.
- **Cursor rules** — updated paths for `src/` layout and compiled models.

### Dependency notes

- **JXP** — `^4.0.0` from npm. For framework work, clone `../jxp` and use `npm run link:jxp` (see `scripts/jxp-link.js`).
- **Node** — `>=22.0.0` (unchanged).

---

## v2.0.1 and earlier

- JavaScript codebase at repo root (`bin/server.js`, `models/*_model.js`).
- JXP 2.x (`^2.15`), Mongoose 6.12.6.
- Vitest e2e for `GET /api/reader` only.
- Local JXP linking via `.use-local-jxp` marker and `scripts/jxp-link.js`.
