# scout

Multi-source web research from the terminal. Built for AI agents.

Scout searches across 6 sources — Exa, Google, Scholar, News, HackerNews, Reddit — and gives agents the right context to do their job. Each source has different strengths. Scout knows when to use each one.

```
$ scout "does AI tutoring actually work" --source google --num 3

-- "does AI tutoring actually work" [Google]

   Answer: Students who got both human and AI tutoring were able to correct misconceptions
   and offer correct answers over 90% of the time...
   Also asked: Is AI an effective tutor? | How much do AI tutors get paid?
   Related: Does ai tutoring actually work reddit | Harvard AI tutor study | Brookings AI

[af4] 3 results
...
```

## Install

Requires [Bun](https://bun.sh) (v1.0+).

```bash
git clone https://github.com/yavzius/scout.git
cd scout
bun build --compile src/cli.ts --outfile scout
cp scout ~/.local/bin/
```

## Setup

```bash
scout setup exa <key>       # exa.ai — web search (required)
scout setup serper <key>     # serper.dev — google, scholar, news, reddit (required)
scout setup firecrawl <key>  # firecrawl.dev — direct URL extraction (optional)
scout setup gemini <key>     # aistudio.google.com — content analysis (optional)
```

Install the research skill for your AI agent:

```bash
scout install --skills       # installs for Claude Code, Codex, OpenCode, Gemini
```

## Sources

| Source | Flag | Best for | Cost |
|--------|------|----------|------|
| Exa | (default) | Understanding topics, full content | ~$0.01/q |
| Google | `--source google` | Exact match, `site:` filters, related searches | ~$0.001/q |
| Scholar | `--source scholar` | Academic papers, citation counts | ~$0.001/q |
| News | `--source news` | Current events, timestamped | ~$0.001/q |
| HN | `--source hn` | Tech community opinions, comments | free |
| Reddit | `--source reddit` | User opinions, consumer sentiment | ~$0.001/q |

Run `scout sources --help` for detailed guidance on when to use each.

## Usage

### Search

```bash
scout "how does spaced repetition work"                 # Exa (default)
scout "\"Lalilo\" site:reddit.com" --source google      # Google exact match
scout "productive failure mathematics" --source scholar --after 2024  # Papers
scout "edtech evaluation 2026" --source news            # Current events
scout "Claude Code" --source hn --days 30               # HN stories
scout "Alpha School" --source reddit                    # Reddit via Google
```

### Expand results

Search stores full page text. Expanding is instant and free:

```bash
scout '?abc:1,2,3' --raw              # full text
scout '?abc:1' -c "key findings?"     # Gemini-analyzed
```

### Drill into comments

```bash
# HN: top comments ranked by community
scout "hn:47050215" --source hn
# HN: filtered comments within a story
scout "hn:47050215 pricing" --source hn
# HN: search ALL comments globally (finds hidden discussions)
scout "Claude Code" --source hn --comments

# Reddit: load comment thread with karma badges
scout "reddit:/r/Teachers/comments/abc123/title/" --source reddit
```

### Direct URL extraction

```bash
scout extract https://example.com/article --raw
scout extract https://example.com/article -c "What's the main argument?"
```

### Help

```bash
scout --help                # quick reference
scout sources --help        # when to use each source
scout extract --help        # how expand works
```

## How it works

**Search flow:** query → source provider → results with summaries → stored in session

**Expand flow:** session ID → stored text returned instantly (no extra API call for Exa results)

**Reddit:** uses Google (`site:reddit.com`) for discovery, Reddit API for comments. Shows karma badges for author credibility.

**HN:** uses Algolia for search, Firebase for ranked comments. Shows karma and reply counts.

**Scholar:** auto-quotes first 2 words for better results. Filters by year client-side.

**Google:** returns answer box, "people also ask", and related searches alongside results.

## Architecture

```
src/
├── cli.ts              ← entry point, arg parsing, routing
├── types.ts            ← shared interfaces
├── commands/
│   ├── search.ts       ← multi-source search routing
│   ├── extract.ts      ← expand from session or direct URL
│   ├── install.ts      ← skill installation for agents
│   ├── cache.ts        ← cache management
│   └── setup.ts        ← API key configuration
├── providers/
│   ├── exa.ts          ← Exa API (search + content)
│   ├── serper.ts       ← Google, Scholar, News via Serper
│   ├── hackernews.ts   ← HN Algolia + Firebase
│   ├── reddit.ts       ← Google discovery + Reddit API
│   ├── firecrawl.ts    ← direct URL extraction
│   └── gemini.ts       ← content analysis
├── lib/
│   ├── config.ts       ← API keys, config loading
│   ├── cache.ts        ← extraction cache (24h TTL)
│   ├── session.ts      ← search sessions (200 max)
│   ├── output.ts       ← terminal formatting
│   └── validate.ts     ← error page detection
└── skills/
    └── research/
        ├── SKILL.md           ← research skill for AI agents
        └── references/        ← deep topic guides
```

No runtime dependencies. Compiles to a single binary.

## License

MIT
