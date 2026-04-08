---
name: scout-research
description: Multi-source web research using scout CLI. Use when researching topics, finding evidence, gathering community opinions, discovering academic papers, competitive analysis, or any task requiring web search. Covers Exa, Google, Scholar, News, HackerNews, Reddit, and GitHub.
allowed-tools: Bash(scout:*) Bash(gh:*)
---

# Web Research with scout

## Quick start

```bash
# search the web (Exa — best for understanding)
scout "how does spaced repetition work"
# expand a result to full text (free, instant)
scout '?abc:1,2' --raw

# google search (best for exact match, site: filters)
scout "\"Lalilo\" site:reddit.com" --source google
# academic papers with citation counts
scout "productive failure mathematics" --source scholar --after 2024
# current news
scout "edtech evaluation 2026" --source news

# community opinions
scout "Alpha School" --source hn
scout "Alpha School" --source reddit
# drill into comments
scout "hn:47050215" --source hn
scout "reddit:/r/AustinParents/comments/1o0hv4s/alpha_school_updated_thoughts/" --source reddit

# github repos and code
gh api search/repositories -f q="spaced repetition" -f sort=stars -f per_page=5
```

## Sources

Each source answers a different question. Pick based on what you need.

| Source | Flag | Best for | Cost |
|--------|------|----------|------|
| Exa | (default) | Understanding topics, full content | ~$0.01 |
| Google | `--source google` | Exact phrases, `site:`, niche terms | ~$0.001 |
| Scholar | `--source scholar` | Papers, citation counts | ~$0.001 |
| News | `--source news` | Current events, timestamped | ~$0.001 |
| HN | `--source hn` | Tech community opinions | free |
| Reddit | `--source reddit` | User opinions, consumer sentiment | ~$0.001 |
| GitHub | `gh api search/...` | Code, repos, issues | free |

## Search commands

```bash
# Exa (default) — understanding, summaries, full stored content
scout "query" --num 5
scout "query" --deep                    # thorough multi-step (slower)
scout "query" --days 30                 # recent only
scout "query" --category "research paper"  # also: news, company, people
scout "query" --domains "nature.com,arxiv.org"

# Google — exact recall, site filtering
scout "query" --source google --num 5
scout '"exact phrase" site:reddit.com' --source google
# IMPORTANT: returns answer box, "people also ask", and related searches on stderr
# Use related searches to discover follow-up queries

# Scholar — academic papers
scout "query terms" --source scholar --num 5
scout "query terms" --source scholar --after 2024
# Auto-quotes first 2 words. Use specific terms not broad ones.
# Citation counts shown: >100 = foundational, >10 = established, 0 = new

# News — current events
scout "topic" --source news --num 5

# HN — stories and comments
scout "topic" --source hn --num 5       # stories
scout "topic" --source hn --comments    # search ALL comments globally
scout "hn:47050215" --source hn         # top comments on story (HN-ranked)
scout "hn:47050215 pricing" --source hn # filtered comments in story

# Reddit — posts and comments
scout "topic" --source reddit --num 5
scout "topic" --source reddit --subreddit Teachers
scout "reddit:/r/sub/comments/id/slug/" --source reddit  # load thread

# GitHub — repos, code, issues
gh api search/repositories -f q="topic" -f sort=stars -f per_page=5
gh api search/repositories -f q="topic in:readme" -f per_page=5
gh api search/code -f q="pattern language:typescript" -f per_page=5
gh api search/issues -f q="topic type:issue" -f sort=comments -f per_page=5
```

## Expand results

```bash
scout '?abc:1,2,3' --raw        # full text (instant for Exa, uses Firecrawl for HN/Reddit)
scout '?abc:1' -c "question"    # Gemini-analyzed with your question as focus
scout '?abc:all' --raw           # all results
```

Token estimates shown on stderr before content. Use to decide: read all, pick shortest, or summarize.

## Credibility signals

- **Scholar**: citation count (cited 271x = authoritative)
- **HN/Reddit comments**: karma badges — no badge = new user, * = established (1K+/5K+), ** = authority (10K+/50K+)
- **HN stories**: point count + comment count
- **Reddit posts**: score + subreddit context
- **Google**: answer box = Google's highest-authority answer

## Research workflow

For thorough research, follow this sequence. For quick lookups, just search and expand.

### 1. Plan
Decompose into 3-7 sub-questions. Think: what angles exist? Technical, contrarian, user experience, financial, historical.

### 2. Search across sources
Don't run the same query everywhere. Pick the right source per question:
- Need to understand? → Exa
- Need evidence? → Scholar
- Need current state? → News
- Need to find a specific mention? → Google
- Need developer opinions? → HN
- Need user/consumer opinions? → Reddit
- Need actual code/implementations? → GitHub

Launch subagents in parallel for independent sub-questions.

### 3. Follow the leads
- Google's "Related searches" reveal queries you didn't think of
- Reddit/HN comments contain links to primary sources — follow them
- HN `--comments` finds hidden discussions in unrelated threads
- Scholar papers cite other papers — search for the most-cited ones

### 4. Gap analysis
After each round: what's MISSING? What contradicts? Which claims have only one source? What's the strongest counterargument?

### 5. Verify
- Important claims need 2+ independent sources
- Check who's behind each source (lateral reading)
- For numbers: trace to primary data
- For opinions: check commenter credibility (karma, account age)

Confidence levels: HIGH (2+ credible sources agree), MEDIUM (1 reliable source), LOW (single source or inference), UNVERIFIED (stated but not confirmed).

## Source-specific tips

* **Choosing sources wisely** [references/source-selection.md](references/source-selection.md)
* **Scholar search strategies** [references/scholar-tips.md](references/scholar-tips.md)
* **Reddit and HN deep dives** [references/community-research.md](references/community-research.md)
* **Verification patterns** [references/verification.md](references/verification.md)
