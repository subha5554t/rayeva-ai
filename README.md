# 🌿 Rayeva AI — Sustainable Commerce Intelligence Modules

> Full-stack AI assignment submission | Node.js + Express + OpenAI + PostgreSQL

---

## Implemented Modules

| Module | Status | Endpoint |
|--------|--------|----------|
| Module 1: AI Auto-Category & Tag Generator | ✅ Implemented | `/api/categorizer` |
| Module 2: AI B2B Proposal Generator | ✅ Implemented | `/api/proposals` |
| Module 3: AI Impact Reporting Generator | 📐 Architecture outlined below | — |
| Module 4: AI WhatsApp Support Bot | 📐 Architecture outlined below | — |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY and DB credentials
```

### 3. Set up the database
```bash
# Create a PostgreSQL database named rayeva_db, then:
npm run db:init
```

### 4. Start the server
```bash
npm run dev      # development (hot reload)
npm start        # production
```

---

## API Reference

### Module 1 — Auto-Category & Tag Generator

#### `POST /api/categorizer/product`
Categorise a product provided in the request body.

**Request:**
```json
{
  "name": "Bamboo Cutlery Set",
  "description": "A reusable bamboo cutlery set including fork, spoon, knife, and chopsticks. Comes in a cotton carry pouch. Fully plastic-free.",
  "id": "optional-uuid-if-already-in-db"
}
```

**Response:**
```json
{
  "success": true,
  "product": { "id": "...", "name": "Bamboo Cutlery Set" },
  "categorisation": {
    "primary_category": "Home & Living",
    "sub_category": "Kitchen & Dining",
    "seo_tags": ["bamboo-cutlery", "reusable-utensils", "eco-friendly-cutlery", "plastic-free-cutlery", "sustainable-dining", "zero-waste-kitchen"],
    "sustainability_filters": ["plastic-free", "biodegradable", "zero-waste"],
    "confidence_score": 0.97,
    "reasoning": "Product is clearly a kitchen utensil set made from biodegradable bamboo with no plastic components."
  },
  "meta": {
    "model": "gpt-4o",
    "durationMs": 1842,
    "tokens": { "prompt": 312, "completion": 147 },
    "dbRecordId": "uuid-of-saved-record"
  }
}
```

#### `POST /api/categorizer/product/:id`
Categorise a product already stored in the `products` table.

#### `POST /api/categorizer/batch`
Categorise all products that don't yet have a category record.

#### `GET /api/categorizer/logs?limit=20`
Retrieve recent AI audit logs for this module.

---

### Module 2 — B2B Proposal Generator

#### `POST /api/proposals/generate`
Generate a full B2B procurement proposal.

**Request:**
```json
{
  "company": "GreenTech Offices",
  "industry": "Technology",
  "budget": 5000,
  "quantity": 200,
  "preferences": "Desk accessories and breakroom eco-products",
  "clientId": "optional-uuid-if-client-in-db"
}
```

**Response:**
```json
{
  "success": true,
  "proposal": {
    "proposal_id": "RVP-2024-8832",
    "client": { "company": "GreenTech Offices", "industry": "Technology" },
    "executive_summary": "This proposal outlines a curated selection of sustainable office products...",
    "product_mix": [
      {
        "product_name": "Recycled Notebook Set (3-pack)",
        "category": "Office & Stationery",
        "quantity": 60,
        "unit_price": 12.50,
        "total_price": 750.00,
        "sustainability_highlights": ["100% post-consumer recycled paper", "Soy-based ink printing"],
        "supplier_notes": "MOQ 50 units. Lead time 7 days."
      }
    ],
    "budget_allocation": {
      "total_budget": 5000,
      "total_allocated": 4820.00,
      "remaining_budget": 180.00,
      "utilisation_percent": 96.4,
      "breakdown_by_category": { "Office & Stationery": 1500, "Personal Care & Beauty": 900 }
    },
    "impact_summary": {
      "plastic_avoided_kg": 18.4,
      "carbon_saved_kg": 32.1,
      "trees_equivalent": 4,
      "local_sourcing_percent": 60,
      "impact_statement": "By switching to this sustainable product mix, GreenTech Offices will divert approximately 18kg of plastic from landfill annually..."
    },
    "recommended_positioning": "Position this as part of GreenTech's ESG commitment in quarterly reports...",
    "next_steps": ["Approve proposal", "Place order within 5 business days for Q4 delivery", "Share impact report with stakeholders"]
  },
  "meta": { "model": "gpt-4o", "durationMs": 3241, "tokens": { "prompt": 680, "completion": 890 } }
}
```

#### `GET /api/proposals?limit=20`
List all generated proposals.

#### `GET /api/proposals/:id`
Retrieve a specific proposal by UUID.

#### `GET /api/proposals/logs?limit=20`
Retrieve AI audit logs for this module.

---

## Architecture Overview

```
rayeva-ai/
├── src/
│   ├── app.js                         # Express app, global middleware, route mounting
│   ├── db/
│   │   ├── client.js                  # PostgreSQL connection pool (pg)
│   │   ├── schema.sql                 # All table definitions + seed data
│   │   └── init.js                    # One-time DB setup script
│   ├── middleware/
│   │   ├── logger.js                  # Winston console/file logger + AI audit log writer
│   │   └── errorHandler.js            # Central Express error handler + asyncWrap util
│   └── modules/
│       ├── categorizer/
│       │   ├── prompt.js              # Pure prompt builder functions (no I/O)
│       │   ├── service.js             # AI call, validation, DB write, logging
│       │   └── route.js              # Express route handlers + input validation
│       └── proposal/
│           ├── prompt.js              # Pure prompt builder functions (no I/O)
│           ├── service.js             # AI call, budget recalc, DB write, logging
│           └── route.js              # Express route handlers + input validation
├── logs/                              # Winston log files (auto-created)
├── .env.example
├── package.json
└── README.md
```

### Key Architecture Decisions

**1. AI / Business Logic Separation**
Every module has three distinct layers:
- `prompt.js` — Pure functions that build prompts. No I/O, no DB, no OpenAI calls.
- `service.js` — Orchestrates the AI call, applies business rules, writes to DB, logs.
- `route.js` — Handles HTTP concerns only (validation, request parsing, response formatting).

**2. Business Rules Override AI Output**
The AI is treated as a *suggestion engine*, not a source of truth for financial or categorical data:
- `categorizeProduct` validates `primary_category` against an allowlist before saving.
- `generateProposal` recalculates all totals and budget allocations from first principles after the AI responds — the AI's arithmetic is never trusted directly.

**3. Prompt Design Philosophy**
- **JSON mode enforced**: `response_format: { type: 'json_object' }` prevents markdown wrapping.
- **Low temperature**: 0.2 for categoriser (deterministic), 0.4 for proposals (some creativity needed).
- **Constraints embedded in prompt**: Budget hard limits, category allowlists, and array size ranges are all stated in the prompt itself.
- **System + User separation**: System prompt sets persona and rules; user prompt provides the specific task.

**4. Full Audit Trail**
Every AI call writes to the `ai_logs` table: prompt sent, raw response, parsed output, token counts, latency, and success/failure. Logging failures never crash the main flow.

---

## Module Architecture Outlines (3 & 4)

### Module 3 — AI Impact Reporting Generator

**Trigger:** Post-order webhook (`POST /api/impact/order/:orderId`)

**Flow:**
1. Fetch order from DB (product IDs, quantities, weights, supplier locations)
2. Pre-compute impact inputs using business logic:
   - `plastic_saved_kg = Σ (item.plastic_weight_g × qty) / 1000`
   - `carbon_avoided_kg = Σ (item.weight_kg × 0.6 × qty)` _(0.6kg CO₂/kg industry average)_
   - `local_sourcing_pct = local_items / total_items × 100`
3. Send computed numbers + product list to GPT-4o to generate a **human-readable impact narrative**
4. Store the narrative + raw metrics alongside the order record
5. Return structured JSON with both numeric metrics and the narrative

**Tables needed:** `order_items`, `products` (extended with weight/material fields), `order_impact_reports`

**Key design choice:** All numeric estimates are computed deterministically in code. The AI only writes the narrative — it never invents numbers.

---

### Module 4 — AI WhatsApp Support Bot

**Infrastructure:** Twilio WhatsApp API → webhook → Express → OpenAI → Twilio reply

**Flow:**
1. Twilio sends `POST /api/whatsapp/webhook` with user message + phone number
2. **Intent classifier** (OpenAI call): Classify into `order_status | return_policy | refund_request | general`
3. **Route by intent:**
   - `order_status` → Query `orders` table by phone number → Inject real order data into prompt → GPT generates natural reply
   - `return_policy` → Retrieve policy text from config → GPT generates friendly explanation
   - `refund_request` → Flag as high-priority → Notify human agent via email/Slack webhook → Send acknowledgement to customer
   - `general` → GPT answers from Rayeva product knowledge base
4. Log full conversation to `whatsapp_conversations` table
5. Send reply via Twilio API

**Tables needed:** `whatsapp_conversations` (session_id, phone, messages JSONB, escalated BOOLEAN)

**Key design choice:** Real DB data (order status, customer name) is injected into the prompt. The AI never guesses about order status — it only narrates data fetched from the DB.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Your GROQAI API key | ✅ |
| `GROQAI_MODEL` | Model to use (default: `llama-3.3-70b-versatile `) | ❌ |
| `DB_HOST` | PostgreSQL host | ✅ |
| `DB_PORT` | PostgreSQL port (default: 5432) | ❌ |
| `DB_NAME` | Database name | ✅ |
| `DB_USER` | Database user | ✅ |
| `DB_PASSWORD` | Database password | ✅ |
| `PORT` | Server port (default: 3000) | ❌ |
| `LOG_LEVEL` | Winston log level (default: info) | ❌ |

---

## Evaluation Criteria — How This Submission Meets Them

| Criteria | Implementation |
|----------|----------------|
| **Structured AI Outputs** | Both modules return validated JSON with defined schemas. `response_format: json_object` enforced at API level. |
| **Business Logic Grounding** | Category allowlists, budget recalculation, and arithmetic verification happen in code — never delegated to AI. |
| **Clean Architecture** | Strict 3-layer separation: prompt / service / route. No AI calls in route handlers. No DB calls in prompt builders. |
| **Practical Usefulness** | Batch categorisation endpoint, proposal retrieval, and audit logs make this immediately usable in production. |
| **Creativity & Reasoning** | Industry-aware proposal personas, confidence scoring, impact narratives, and recalculated budget breakdowns go beyond the minimum spec. |
