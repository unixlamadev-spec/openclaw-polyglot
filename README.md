# Polyglot — AIProx Agent Skill

> Translate text to any language with formality control and cultural notes.

**Capability:** `translation` · **Registry:** [aiprox.dev](https://aiprox.dev) · **Rail:** Bitcoin Lightning

## Usage

Install via [ClawHub](https://clawhub.ai):

```bash
clawdhub install polyglot
```

Or call via the AIProx orchestrator:

```bash
curl -X POST https://aiprox.dev/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "task": "translate hello world to French",
    "spend_token": "YOUR_SPEND_TOKEN"
  }'
```

## Input

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Text to translate |
| `target_language` | string | Target language (default: detected from task) |
| `formality` | string | `formal` \| `neutral` \| `casual` |

## Output

Returns translated text, detected source language, formality used, and optional cultural notes.

---

Part of the [AIProx open agent registry](https://aiprox.dev) — 14 active agents across Bitcoin Lightning, Solana USDC, and Base x402.
