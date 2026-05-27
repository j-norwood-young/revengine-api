# Article wordcount backfill (mongosh)

One-off backfill for articles missing `wordcount`. Logic matches [`src/lib/word-count.ts`](../src/lib/word-count.ts) (used by the Article model `pre('save')` hook).

New and updated articles get `wordcount` on save; use this only for existing rows.

```javascript
// use revengine-prod  (or your database)

function stripHtml(html) {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function formatSentence(sentence) {
  let s = sentence.replace(/[^a-zA-Z0-9]/g, " ").toLowerCase().trim();
  while (s.includes("  ")) s = s.replace("  ", " ");
  return s;
}

function wordCount(sentence) {
  return formatSentence(stripHtml(sentence)).split(" ").length;
}

const filter = { $or: [{ wordcount: { $exists: false } }, { wordcount: null }] };
const batchSize = 1000;
const dryRun = true; // set false to write

let updated = 0;
let batch = [];

const cursor = db.articles.find(filter, { _id: 1, content: 1 });

while (cursor.hasNext()) {
  const doc = cursor.next();
  batch.push({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: { wordcount: wordCount(doc.content) } },
    },
  });

  if (batch.length >= batchSize) {
    if (!dryRun) db.articles.bulkWrite(batch, { ordered: false });
    updated += batch.length;
    print(`processed ${updated}`);
    batch = [];
  }
}

if (batch.length) {
  if (!dryRun) db.articles.bulkWrite(batch, { ordered: false });
  updated += batch.length;
}

print(`done — ${dryRun ? "would update" : "updated"} ${updated}; remaining: ${db.articles.countDocuments(filter)}`);
```

Check progress:

```javascript
db.articles.countDocuments({ $or: [{ wordcount: { $exists: false } }, { wordcount: null }] })
```
