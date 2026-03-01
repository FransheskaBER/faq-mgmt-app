# FAQ Management App

A full-stack FAQ system with an admin dashboard, a public-facing viewer, and an AI chat assistant grounded in your published content.

---

## Problem

Support teams waste time answering the same questions repeatedly. Generic chatbots hallucinate. Static FAQ pages go stale.

This app gives admins a single interface to write, publish, and maintain FAQs — and gives end users a chat interface that answers questions *from that content only*, falling back to "I don't know" rather than guessing.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Runtime** | Node.js + Express 5 | Minimal overhead, async-native, familiar ecosystem |
| **Database** | PostgreSQL + Knex.js | `pg_trgm` extension enables fuzzy text search without a separate search service |
| **AI** | OpenAI API | Rewrites retrieved FAQ answers into conversational responses |
| **Frontend** | Vanilla JS | No build toolchain needed; this is a two-page internal tool |

---

## Architecture

```
Browser (Admin)          Browser (Public)
      |                        |
      |  GET/POST/PUT/DELETE   |  GET /faqs/published
      |  /faqs, /faqs/:id      |  POST /faqs/chat
      ↓                        ↓
┌─────────────────────────────────────┐
│           Express Server            │
│                                     │
│  ┌──────────┐    ┌───────────────┐  │
│  │  FAQ     │    │  Chat         │  │
│  │  Routes  │    │  Route        │  │
│  └────┬─────┘    └──────┬────────┘  │
│       │                 │           │
│  ┌────▼─────┐    ┌──────▼────────┐  │
│  │  FAQ     │    │  Chat         │  │
│  │Controller│    │  Controller   │  │
│  └────┬─────┘    └──────┬────────┘  │
│       │                 │           │
│  ┌────▼─────┐    ┌──────▼────────┐  │
│  │  FAQ     │    │  Chat Model   │  │
│  │  Model   │    │  (similarity) │  │
│  └────┬─────┘    └──────┬────────┘  │
└───────┼─────────────────┼───────────┘
        ↓                 ↓
   PostgreSQL ────── pg_trgm search
                          |
                     ┌────▼─────┐
                     │ OpenAI   │
                     │   API    │
                     └──────────┘
```

**Request flow for chat:**
1. User submits a question
2. `pg_trgm` similarity search scores all published FAQs against the query
3. If top score < 0.25 → return "I don't know" (no OpenAI call made)
4. If score ≥ 0.25 → pass canonical answer to OpenAI for conversational rewrite
5. Return answer + confidence score + source FAQs

---

## Getting Started

**Prerequisites:** Node.js 18+, PostgreSQL 14+

```bash
# 1. Clone and install
git clone https://github.com/your-username/faq-mgmt-app.git
cd faq-mgmt-app
npm install

# 2. Create the database
psql -U postgres -c "CREATE DATABASE helpdesk_app;"
psql -U postgres -d helpdesk_app -c "CREATE EXTENSION pg_trgm;"
psql -U postgres -d helpdesk_app -c "
  CREATE TABLE faqs (
    id          SERIAL PRIMARY KEY,
    question    VARCHAR(200) NOT NULL,
    answer      VARCHAR(500) NOT NULL,
    category    VARCHAR(100) NOT NULL,
    is_published BOOLEAN DEFAULT false,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  );
"

# 3. Configure environment
cp .env.example .env
# Fill in: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE, OPENAI_API_KEY

# 4. Start
node server.js
```

| Page | URL |
|---|---|
| Admin dashboard | http://localhost:2200 |
| Public FAQ viewer + chat | http://localhost:2200/live.html |

---

## Key Design Decisions

### 1. Confidence-gated AI responses

The chat endpoint checks the top trigram similarity score against a `0.25` threshold *before* making an OpenAI API call. Below threshold, the system returns "I don't know based on the official FAQs" — no model call, no hallucination risk. Above threshold, OpenAI rewrites the canonical answer into a conversational tone, but the content stays grounded in what was retrieved. The gate is at the retrieval layer, not the model layer, which is where it's cheapest to enforce.

### 2. PostgreSQL `pg_trgm` instead of a vector database

Fuzzy question matching uses Postgres's built-in `pg_trgm` extension — `similarity(question, query)` — ordered by score, limited to 3 results. For a domain-bounded FAQ corpus, trigram similarity is fast, tunable with a single threshold constant, and requires zero additional infrastructure. Reaching for a vector database or a dedicated search service would add operational complexity that the problem doesn't justify at this scale.

### 3. Client-side field diff before PUT

The edit modal serializes the original FAQ record into `dataset.originalFaq` at open time. On submit, it computes a field-level diff and sends only changed keys to `PUT /faqs/:id`. If nothing changed, the modal closes without making a network call. This makes the client behave with PATCH semantics even through a form, avoids blind overwrites of concurrent edits, and keeps the server's update path clean — it only writes fields it explicitly receives.

---

## What I'd Do Differently / Next Steps

**If I were starting over:**

- **TypeScript throughout.** The controller/model boundary is the right place for strict types — right now, nothing stops a bad `changes` object from reaching the DB.
- **Database migrations.** The setup SQL above should be a versioned migration (Knex migrations or Flyway), not a README block.
- **Authentication.** The admin endpoints are fully open. A simple JWT middleware would scope write access without adding much complexity.

**Next features:**

- **Semantic search fallback.** `pg_trgm` handles typos well but misses paraphrasing. Adding OpenAI embeddings + pgvector as a second-pass retrieval step would improve recall on semantically similar questions.
- **Analytics.** Log which questions go unanswered (confidence < 0.25) — that's a direct signal for which FAQs to write next.
- **Streaming responses.** The chat UX would feel significantly faster with SSE streaming instead of waiting for the full OpenAI response.
