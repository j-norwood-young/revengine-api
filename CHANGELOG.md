# Changelog

Notable changes to the RevEngine API.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
