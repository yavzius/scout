# scout

Fast, structured web research from the terminal.

Scout is a three-stage research pipeline: **search** the web with [Exa](https://exa.ai), **extract** clean content with [Firecrawl](https://firecrawl.dev), and **analyze** it with [Gemini](https://ai.google.dev). Results are cached, sessions are tracked, and everything pipes cleanly into other tools.

```
$ scout "attention is all you need" --category "research paper" --num 5

🔍 "attention is all you need" [category=research paper]

[scout:a3f] 5 results:

[1] Attention Is All You Need [2017-06-12]
    arxiv.org — Vaswani et al.
    "Proposes the Transformer architecture, replacing recurrence with self-attention..."

[2] An Introduction to Attention Mechanisms [2023-11-15]
    magazine.sebastianraschka.com — Sebastian Raschka
    "A comprehensive overview of attention mechanisms in deep learning..."

...

Extract: scout '?a3f:1,2,3' or scout '?a3f:all'
```

Then drill into any result:

```
$ scout '?a3f:1,2' -c "How does multi-head attention differ from single-head?"

📄 Extracting 2 article(s) [analyze] with context...

   [1] Attention Is All You Need...
   [1] ⚡ Cached
   [1] ✓ Analyzed (from cache)
   [2] An Introduction to Attention Mechan...
   [2] ✓ Analyzed

══════════════════════════════════════════════════════════════════════════
[1] Attention Is All You Need
https://arxiv.org/abs/1706.03762
══════════════════════════════════════════════════════════════════════════

1. **CORE ARGUMENT**: Multi-head attention allows the model to jointly attend
   to information from different representation subspaces at different positions...

2. **KEY INSIGHTS**:
   - Single-head attention averages over all positions, diluting focus...
   ...
```

## Install

Requires [Bun](https://bun.sh) (v1.0+).

```bash
git clone https://github.com/yavzius/scout.git
cd scout
bun install
bun run build
```

This compiles a standalone binary. Move it to your PATH:

```bash
cp scout ~/.local/bin/
# or
ln -s "$(pwd)/scout" ~/.local/bin/scout
```

Or run directly without compiling:

```bash
bun run src/cli.ts "your query"
```

## Setup

Scout requires three API keys:

| Service | Purpose | Get a key |
|---------|---------|-----------|
| [Exa](https://exa.ai) | Web search | [exa.ai](https://exa.ai) |
| [Firecrawl](https://firecrawl.dev) | Page extraction | [firecrawl.dev](https://firecrawl.dev) |
| [Gemini](https://ai.google.dev) | Content analysis | [aistudio.google.com](https://aistudio.google.com/apikey) |

Configure them:

```bash
scout setup exa <your-key>
scout setup firecrawl <your-key>
scout setup gemini <your-key>
```

Keys are saved to `~/.config/{service}/api_key` with `0600` permissions. Environment variables (`EXA_API_KEY`, `FIRECRAWL_API_KEY`, `GEMINI_API_KEY`) take precedence.

Check status anytime:

```bash
scout setup
```

## Usage

### Search

```bash
scout "query"                                    # Basic search
scout "query" --num 5                            # Limit results
scout "query" --category news --days 7           # Recent news
scout "query" --category "research paper"        # Academic papers
scout "query" --domains arxiv.org,nature.com     # Specific domains
scout "query" --exclude reddit.com               # Exclude domains
scout "query" --type neural                      # Force neural search
scout "query" --after 2024-01-01                 # Date filtering
```

Each search returns a session ID (e.g., `a3f`) for referencing results later.

### Extract & Analyze

Extract results from a search session:

```bash
scout '?a3f:1,2,3'        # Extract specific results by index
scout '?a3f:all'           # Extract top 5
scout '?:1,2'              # From most recent session
```

Add research context for targeted analysis:

```bash
scout '?a3f:1,2' -c "What are the practical limitations?"
scout '?a3f:1,2' --context-file ./research-notes.md
```

Get raw markdown (skip Gemini analysis):

```bash
scout '?a3f:1' --raw
scout '?a3f:1' --raw --limit 20000    # More content
```

### Direct URL

Extract and analyze any URL directly:

```bash
scout extract https://example.com/article
scout extract https://example.com/article --raw
scout extract https://example.com/article -c "What's the main argument?"
```

### Cache

Extractions are cached for 24 hours to avoid redundant API calls:

```bash
scout cache              # Show stats
scout cache clear        # Clear cache
```

### JSON Output

Every command supports `--json` for piping into other tools:

```bash
scout "query" --json | jq '.results[].url'
scout '?a3f:1' --json | jq '.content'
```

## Architecture

```
src/
├── cli.ts              ← Entry point, arg parsing, command routing
├── types.ts            ← All shared TypeScript interfaces
├── commands/
│   ├── search.ts       ← Search command: query → Exa → session
│   ├── extract.ts      ← Extract command: session → Firecrawl → Gemini
│   ├── cache.ts        ← Cache management
│   └── setup.ts        ← API key configuration
├── providers/
│   ├── exa.ts          ← Exa API client (typed request/response)
│   ├── firecrawl.ts    ← Firecrawl API client (typed)
│   └── gemini.ts       ← Gemini API client (typed)
└── lib/
    ├── config.ts       ← API key loading, config file support
    ├── cache.ts        ← Extraction cache (24h TTL, 50 entry cap)
    ├── session.ts      ← Search session state (2h TTL, 10 max)
    └── output.ts       ← Terminal + JSON output formatting
```

**Data flow:** CLI → Command → Provider(s) → Output

- **Providers** are pure API clients. Each handles one external service with fully typed requests and responses.
- **Commands** orchestrate the workflow for each user action, composing providers and lib utilities.
- **Lib** modules handle stateless concerns: caching, session persistence, configuration, formatting.

No runtime dependencies. Compiles to a single binary via `bun build --compile`.

## License

MIT
