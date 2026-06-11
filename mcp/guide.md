# RevEngine API — MCP guide

This section extends the built-in JXP MCP guide for the Daily Maverick RevEngine data model.

## Core concepts

- **reader** — A person in the audience database (email, subscription state, engagement). Often millions of rows.
- **segment** — A saved audience definition (rules/filters). Used for targeting newsletters and campaigns.
- **article** — Published content metadata.
- **hit** / **dailyhit** — Page views and aggregated daily traffic.
- **interaction** — Reader actions (clicks, form fills, etc.).
- **label** — Tags applied to readers or content.
- **subscription** / **order** — Commerce and membership data.

Whitebeard-prefixed models (`whitebeardcustomer`, `whitebeardnewsletters`, etc.) mirror CMS/newsletter integration data.

## Large collections — critical

These models can have **millions** of documents:

| Model | Guidance |
|-------|----------|
| `reader` | Always `jxp_count` first. Use `filter` on indexed fields (`email`, `_id`). Never list without `fields` and low `limit`. |
| `hit` | Same as reader — count first, filter by date range when possible. |
| `interaction` | Count first; filter by `reader_id` or date. |

Example safe reader lookup by email:

```json
{
  "model": "reader",
  "filter": { "email": "user@example.com" },
  "fields": "_id,email,name,subscription_status",
  "limit": 5
}
```

## Common workflows

### Find a reader

1. `jxp_describe_model` with `reader` — note indexed fields.
2. `jxp_find` with `filter.email` or `search` and tight `fields`.

### Explore a segment

1. `jxp_describe_model` with `segment`.
2. `jxp_find` with `id` for one segment's rules, or list with `fields` and low `limit`.

### Article + engagement

1. `jxp_find` on `article` with `fields` and `filter`.
2. `jxp_count` on `hit` or `interaction` with filters referencing article or date range.

## Models to deprioritize

Legacy integration collections may exist in MongoDB but are not always useful via MCP:

- Sailthru (`sailthru_*` collections) — legacy email platform data.
- Touchbase (`touchbase*` collections) — legacy campaign tooling.
- WooCommerce / WordPress imports — use `order`, `subscription`, `reader` models instead when available.

## Permissions

MCP uses the logged-in user's API key. Admin users see all readable models; non-admin users are limited by schema `perms` like the REST API.
