# LexCloud — Project Context for Claude Agents

This file is read by every Claude session working on this project.
Update it whenever a major decision changes — this rewrite (2026-08-13) syncs
it to what the code actually does, since it had drifted significantly.

---

## What is LexCloud

AI-powered legal document intelligence platform for **Indian law firms**, built on **AWS Mumbai (ap-south-1)**.

**Core use case:** a lawyer uploads a client's FIR/bail application to a case,
then asks natural-language questions about it in a chat interface. LexCloud
retrieves the most relevant passages from the case's own uploaded document(s)
AND relevant precedent from the shared judgment database, and asks Claude
Haiku to answer using both, with citations.

**Why not just use Claude.ai directly?**
DPDP Act 2023 prohibits sending client personal data to servers outside India.
LexCloud keeps all data in ap-south-1. This is the legal reason firms must use
LexCloud instead of Claude.ai or Harvey AI.

**Important — current retrieval scope (read before touching query.js):**
Queries search the case's own documents AND the global KB (1200 judgments),
but as **two separate ranked pools**, not one merged list — see
"RAG Pipeline — Current State" below for exactly why and how.

---

## Dissertation Info (do not change architecture to conflict with this)

- Student: Neet Savaliya, ID 3040040, MSc Cloud Computing, UEL
- Module: CN7000 Dissertation
- Methodology: Design Science Research
- Key results claimed: Retrieval precision 85.4%, Attribution 91.2%, Latency 2.34s median
  (these were measured against an earlier version of the pipeline — re-verify
  before citing them if the retrieval logic below has changed since)

---

## AWS Stack (all ap-south-1)

| Service | Purpose | Env var |
|---|---|---|
| S3 | Raw document storage | `DOCUMENTS_BUCKET=lexcloud-documents` |
| DynamoDB | Case metadata, documents, chat messages, embeddings | `METADATA_TABLE=lexcloud-cases` |
| DynamoDB | Lawyer accounts (auth) | `LAWYERS_TABLE=lexcloud-lawyers` |
| Bedrock (Titan Embeddings v2) | 1024-dim embeddings | `BEDROCK_EMBEDDING_MODEL=amazon.titan-embed-text-v2:0` |
| Bedrock (Claude Haiku) | Answer generation | `BEDROCK_CHAT_MODEL` |
| Textract | Async PDF OCR (multi-page) | used in `services/upload.js` |

Other env vars: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`JWT_SECRET`, `JWT_EXPIRY` (default 7d), `GLOBAL_KB_DIR` (used by
`load_global_kb.js`), `APP_URL` (used to build the password-reset link,
defaults to `http://localhost:3000`).

Credentials are in `backend/.env` — NEVER commit that file.

`backend/setup-infra.js` creates both DynamoDB tables and the S3 bucket if
they don't exist (run once per AWS account).

---

## Repository Structure (actual, as of this rewrite)

```
backend/src/
  server.js              — Express app entry point (port 4000). Mounts routes/index.js.

  routes/
    index.js               — Wires /health, /auth, /cases, /admin.
    auth.routes.js          — POST /auth/{signup,login,forgot-password,reset-password}
    cases.routes.js          — GET/POST /cases, GET/PATCH/DELETE /cases/:id,
                                GET/DELETE /cases/:id/documents(/:docId),
                                POST /cases/:id/upload, POST /cases/:id/query,
                                GET /cases/:id/messages
                                (everything under /cases requires requireAuth)
    admin.routes.js          — POST /admin/global-kb/load (requireAuth; no admin
                                role exists yet, just any logged-in lawyer)
    health.routes.js         — GET /health

  controllers/*.controller.js
                           — HTTP layer only: parse req, validate input, check
                             case ownership (caseData.lawyerId === req.lawyerId),
                             call the matching service, shape the response.
                             No AWS SDK calls happen here.

  services/*.js           — All business logic + AWS SDK calls live here.
    auth.js                 — signup/login (bcrypt + JWT) and forgot/reset password
                               (JWT reset token, hash stored on lawyer record,
                               single-use, 30 min expiry — see below)
    cases.js                — create/list/get/update/delete case, list/delete
                               documents. deleteCase() cascades: deletes every
                               S3 file and every DynamoDB item under that caseId
                               (documents + chat messages + chunks + CASE_META).
                               deleteDocument() cascades to that document's
                               chunk items specifically (see upload.js).
    upload.js                — S3 upload → extract text (Textract for PDF,
                               mammoth for DOCX, direct read for txt) →
                               chunkText() into ~500-word overlapping chunks →
                               embed() each chunk → one chunk DynamoDB item per
                               chunk, plus one lightweight parent document
                               record (no embedding). See Known Problems #1.
    query.js                 — the RAG pipeline. See "RAG Pipeline" section below.
    chat.js                   — persists every question/answer as a DynamoDB item
                               (docId: MSG#<ISO timestamp>#<id>) under the case,
                               so GET /cases/:id/messages replays full history
                               in chronological order for free (sort-key order).

  middleware/
    auth.js                  — requireAuth: verifies JWT, sets req.lawyerId/req.lawyerEmail.
    upload.js                 — multer config (temp-dir storage) for multipart uploads.

  lib/
    aws.js                    — single shared S3/DynamoDB/Textract/Bedrock client instances.
                               Always import clients from here, never construct new ones.
    embeddings.js              — embed(text) via Titan → float[1024]; cosineSim(a, b).

  scripts/
    load_global_kb.js          — loads hand-written .txt KB files (Constitution
                               excerpts, CrPC sections, sample judgments) from a
                               folder into DynamoDB with caseId="GLOBAL". NOT YET
                               RUN against C:\d\deseration\bail_kb\ — those 5 files
                               are not currently in the database.
    load_bail_dataset.js        — pulls the full IndianBailJudgments-1200 dataset
                               from Hugging Face's public REST API (no auth/Python
                               needed) and embeds+stores all 1200 rows with
                               caseId="GLOBAL", docId="bail-<case_id>". ALREADY RUN —
                               all 1200 judgments are in DynamoDB right now.
                               Idempotent (skips docIds already present).

frontend/src/
  index.js                 — BrowserRouter + route table: /login, /signup,
                             /forgot-password, /reset-password, / (ProtectedRoute → App → Dashboard)
  App.js                    — just renders <Dashboard/>
  context/AuthContext.js     — token + lawyer in localStorage, login()/logout()
  api/                       — one fetch wrapper per resource (auth, cases, upload, query),
                             all reading BASE/authHeaders/handle from client.js
  pages/
    Login.js, Signup.js       — auth forms (PasswordInput toggle component used here)
    ForgotPassword.js          — requests reset link; in dev shows the link directly
                             (no real email sending is wired up — see auth.js below)
    ResetPassword.js            — reads ?token= from URL, sets new password
    Dashboard.js                — top-level state: case list, active case, modals, toasts
  components/
    Sidebar.js                 — case list; each row has a ⋮ menu (Edit/Delete)
    NewCaseModal.js / EditCaseModal.js
    CaseView.js                 — per-case state: documents, chat messages, upload/delete handlers
    DocumentsPanel.js            — upload dropzone + document list
    QueryPanel.js                 — the chat UI: scrollable message list (user/assistant
                                 bubbles), source chips per assistant message, input row
    PasswordInput.js               — show/hide toggle, used by Login/Signup/ResetPassword
    Toast.js
```

---

## RAG Pipeline — Current State (`services/query.js`)

`services/query.js` has been through three versions — history matters here
if you're asked to change retrieval behavior again:

1. **v1, commented out at the top of the file** (kept for reference): merged
   the case's documents AND the global KB (`caseId="GLOBAL"`) into ONE pool,
   ranked together by cosine similarity. Problem found in testing: the case's
   own document had to outscore ~1200 global judgments to be included at all,
   and often lost even when it was clearly the right source, purely because
   it was outnumbered (e.g. 22% case-doc score vs 20%/19% judgment scores —
   the case doc barely won, and on vaguer questions it lost outright).
2. **v2 (2026-08-11), no longer in the file**: case-only, dropped the global
   KB fetch entirely to sidestep the v1 problem. Fixed a real bug in the
   process — the `CASE_META` record has no `embedding`, so the old
   `docs.length === 0` check ran before filtering it out, meaning a case with
   zero real uploads still "had documents" and Claude hallucinated an answer
   with a fake citation. That fix (filter-by-embedding BEFORE the empty
   check) is preserved in v3.
3. **v3, ACTIVE (2026-08-13) — two-pool retrieval**: queries the case's own
   documents and the global KB in parallel, as **two separate ranked pools**
   (`rankPool()` helper, called twice), not one merged list.
   `CASE_TOP_K = 2` from the case, `GLOBAL_TOP_K = 2` from the global KB —
   both constants at the top of the file. The case's top matches can never be
   crowded out by the global KB pool, since they're not competing for the
   same slots. The prompt sent to Claude has two clearly labeled sections
   ("CLIENT'S CASE DOCUMENTS" vs "RELEVANT PRECEDENT") instead of one blended
   list, with source numbering continuous across both. If a case has zero
   uploads, it gracefully falls back to precedent-only (case section says
   "No documents uploaded for this case yet."); if global KB has no matches,
   same for the precedent section. Only returns the empty
   `"No documents found for this case."` response if BOTH pools are empty.

Current flow:
1. `embed(question)` → query vector.
2. Two parallel DynamoDB Queries on `caseId-index`: `caseId = <this case>`
   and `caseId = "GLOBAL"`.
3. `rankPool()` on each: filter to items with an `embedding` (excludes
   `CASE_META` / chat messages), cosine-rank, slice to that pool's top-K.
4. Build two prompt sections from the two pools, each source sliced to
   **2000 chars** (see Known Problems #2 — still not fixed).
5. Call Claude Haiku with the two-section prompt, return `{ answer, sources }`
   (each source item still carries `isGlobal: true/false` for the frontend's
   source chips — no frontend change was needed for this).

Called from `controllers/query.controller.js`, which also saves the question
and the answer as chat messages via `services/chat.js` before responding.
Note: `queryCase()`'s signature dropped the unused `topK` parameter when v3
landed — top-K is now controlled per-pool via the two constants above, not
passed in from the controller.

---

## Known Open Problems (not yet fixed — still accurate as of this rewrite)

### 1. ~~Whole-document embedding (no chunking)~~ — RESOLVED 2026-08-15
`services/upload.js` now splits extracted text into ~500-word chunks with
100-word overlap (`chunkText()`, `CHUNK_SIZE_WORDS`/`CHUNK_OVERLAP_WORDS`
constants) and embeds each chunk separately. Found via real testing: a
12,716-char bail application was uploaded whole, and questions about
"grounds for bail" (text started at char 5465) and "bail conditions" (text
started at char ~11199) both got "cannot be determined" answers — not
hallucination, the old 2000-char slice genuinely never showed that part of
the document to Claude. Confirmed fixed after chunking: both questions now
answer correctly, citing the specific chunk (e.g. "part 3/5", "part 5/5").

**Schema change this introduced** — a document is no longer one DynamoDB
item, it's now TWO kinds of items under the same `caseId`:
- **Parent record** (`docId` = the document's own uuid): `caseId, docId,
  docName, s3Key, chunkCount, uploadedAt` — no `embedding`, not searched by
  query.js. This is what `listCaseDocuments()` returns (Documents panel) and
  what `deleteDocument()` takes as input.
- **Chunk records** (`docId` = `<parentDocId>_chunk_<i>`): `caseId, docId,
  parentDocId, chunkIndex, totalChunks, docName, extractedText, embedding,
  uploadedAt` — these are what query.js actually ranks and searches.
  `listCaseDocuments()` filters them out via `attribute_not_exists(parentDocId)`.
  `deleteDocument()` queries for `parentDocId = :docId` and deletes every
  matching chunk before deleting the parent + S3 file. `deleteCase()` needed
  no changes — it already deletes every item under a caseId regardless of
  shape, chunks included.
- Global KB judgment rows (`load_bail_dataset.js`) are NOT chunked — each
  row's fields are short enough (~600 chars) that one vector per row is
  still fine. Only case-uploaded documents go through `chunkText()`.

Pre-existing documents uploaded before this change are still single
whole-document items (no `parentDocId`/chunk siblings) — they still work,
just without the chunking benefit, until re-uploaded.

### 2. Context truncated to 2000 characters — PARTIALLY ADDRESSED 2026-08-15
Bumped to **3500 chars** in `query.js`'s `toSection()` (was 2000) so a full
~500-word chunk is never itself truncated — 500 words is roughly 2850 chars,
so 2000 was clipping even single chunks. This is no longer the acute problem
it was pre-chunking (each stored item is now small on its own), but the
slice is still a blunt instrument worth remembering if chunk size changes.

### 3. No query rewriting
A vague question like "how many days has he been in custody?" embeds poorly
against specific document text. Rewriting the question into concrete search
terms before embedding (via a cheap Haiku call) would improve retrieval for
generic phrasing. Not implemented. (Chunking made this less severe than
originally scoped, since even a mediocre match now retrieves a small precise
passage instead of a whole document — but still the next logical step.)

### 4. ~~Global KB is loaded but not searched~~ — RESOLVED 2026-08-13
Fixed by the two-pool retrieval described above. Global KB is searched again,
just no longer able to crowd out the case's own document.

---

## Global Knowledge Base — actual current status

```
GLOBAL KB (caseId = "GLOBAL" in the lexcloud-cases table):
  ✅ 1200 bail judgments from IndianBailJudgments-1200 (Hugging Face) — LOADED
     via scripts/load_bail_dataset.js. Each row embedded as one structured
     text block (case title, court, IPC sections, facts, legal issues,
     judgment reasoning, outcome, summary) — no chunking needed here since
     individual fields are short (~600 chars max).
  ❌ Constitution Articles 14/21/22/32/226, CrPC bail sections — NOT loaded.
     scripts/load_global_kb.js exists and works, just hasn't been run against
     C:\d\deseration\bail_kb\*.txt yet.

PER-LAWYER CASE (caseId = case UUID):
  Only that case's uploaded documents.
```

`query.js` searches both pools on every query (see RAG Pipeline section, v3).

---

## Features built beyond the original MVP scope

None of these were in earlier versions of this doc — all implemented and tested:

- **Forgot/reset password** (`services/auth.js`, routes `/auth/forgot-password`
  `/auth/reset-password`): JWT reset token (30 min expiry), SHA-256 hash of it
  stored on the lawyer record for single-use validation, no real email sending
  configured — the link is logged server-side and returned in the API response
  outside `NODE_ENV=production` for demo/dev purposes.
- **Persistent per-case chat history** (`services/chat.js`,
  `GET /cases/:id/messages`): every question and answer is stored and replayed
  when a case is reopened; frontend renders it as a real chat UI (QueryPanel.js).
- **Case edit/delete** (`PATCH` / `DELETE /cases/:id`): rename case/client
  name; delete cascades through S3 files and all DynamoDB items for that case.
- **Password show/hide toggle** on all password fields (PasswordInput.js).

---

## Embedding Details

Model: `amazon.titan-embed-text-v2:0`
Dimensions: 1024
Similarity: cosine (`cosineSim()` in `lib/embeddings.js`)
Input limit per embed call: ~8000 chars, truncated in `embed()`
Chunking: case-uploaded documents are split into ~500-word chunks (100-word
overlap) via `chunkText()` in `upload.js`, one vector per chunk (see Known
Problems #1). Global KB judgment rows are NOT chunked — one vector per row,
since individual fields are short enough (~600 chars max) not to need it.

---

## Key Design Decisions (do not revisit without reason)

1. **No vector DB** — embeddings stored in DynamoDB, cosine computed in-memory
   after fetching. Fine up to ~5000 items. Beyond that, migrate to OpenSearch
   Serverless.
2. **Claude Haiku** for generation — cost and latency. Not Sonnet.
3. **ap-south-1 only** — DPDP compliance. Never change region.
4. **JWT auth** — simple, works. No Cognito dependency.
5. **Single DynamoDB table (`lexcloud-cases`)** for cases, documents, chat
   messages, AND the global KB — partition key `caseId` (`"GLOBAL"` for KB
   items, a UUID per real case), sort key `docId`. GSIs: `caseId-index`
   (query all items in a case/GLOBAL — technically redundant with the base
   table's own hash key, kept for historical reasons), `lawyerId-index`
   (sparse — only `CASE_META` items carry `lawyerId`, used to list a lawyer's
   cases). Lawyers live in a separate table (`lexcloud-lawyers`, PK `email`).
6. **Backend has no file-watcher** — `npm start` is plain `node src/server.js`.
   Any backend code change requires manually killing and restarting the
   process; it will silently keep serving old routes/logic otherwise.
