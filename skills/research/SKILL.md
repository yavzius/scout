---
name: research
description: Multi-source web research using scout CLI. Use when you need to research a topic, find evidence, gather community opinions, discover academic papers, or build a comprehensive understanding of any subject. Activates for research tasks, competitive analysis, fact-finding, literature review, or any query requiring more than a single search.
---

# Research with Scout

Scout is a multi-source search CLI. Each source has different strengths. Your job is to pick the right source for what you need, combine them for thorough research, and verify claims across sources.

Run `scout --help` for command reference. Run `scout sources --help` for detailed source guidance.

## Sources and When to Use Each

### Exa (default, no flag)
Best for understanding a topic. Returns AI summaries + stores full page text for instant expand.
- "What is X?", "How does X work?", conceptual queries
- Full content stored — expand with `scout '?abc:1,2'` costs nothing
- Weak at: finding specific terms buried in comments, very fresh news
- Cost: ~$0.01/query

### Google (--source google)
Best for exact-match recall, site: filtering, finding niche terms anywhere.
- `"exact phrase" site:domain.com`, finding where something is mentioned
- Returns answer box, "people also ask", and related searches — use these to discover follow-up queries
- Weak at: conceptual understanding (returns snippets, not summaries)
- Cost: ~$0.001/query

### Scholar (--source scholar)
Best for academic papers with citation counts. Use specific terms, not broad queries.
- Auto-quotes first 2 words for better results
- Use `--after YEAR` to filter to recent papers
- Citation count is a credibility signal: >100 cited = foundational, >10 = established, 0 = new/unproven
- Weak at: broad queries (returns survey papers). Be specific.
- Cost: ~$0.001/query

### News (--source news)
Best for current events, industry news, timestamped results with source attribution.
- "What happened recently with X?"
- Returns source name + date
- Cost: ~$0.001/query

### HackerNews (--source hn)
Best for tech/startup community opinions. Free. Use short simple queries.
- Story search: `scout "topic" --source hn`
- Global comment search: `scout "topic" --source hn --comments` (finds hidden discussions in unrelated threads)
- Top comments on a story (HN-ranked, best first): `scout "hn:ID" --source hn`
- Filtered comments within a story: `scout "hn:ID keyword" --source hn`
- Weak at: non-tech topics
- Credibility signals: karma badges (starred = established), reply counts

### Reddit (--source reddit)
Best for real user opinions, parent/teacher/consumer sentiment. Uses Google for discovery, Reddit API for comments.
- Post search: `scout "topic" --source reddit`
- Subreddit filter: `scout "topic" --source reddit --subreddit Teachers`
- Load comment thread: `scout "reddit:/r/sub/comments/id/slug/" --source reddit`
- Credibility signals: karma badges, post scores, comment counts

### GitHub (gh CLI)
Best for code, repos, issues, README content. Use `gh api` directly.
- Repo search: `gh api search/repositories -f q="topic" -f sort=stars -f per_page=5`
- Code search: `gh api search/code -f q="pattern language:typescript" -f per_page=5`
- Issue search: `gh api search/issues -f q="topic type:issue" -f sort=comments -f per_page=5`
- README search: `gh api search/repositories -f q="topic in:readme" -f per_page=5`

## Research Methodology

### Phase 1: Plan (before any search)

Ask yourself:
- What exactly am I trying to learn?
- What would change my understanding?
- What would a HIGH-quality answer look like?

Decompose into 3-7 sub-questions. Consider angles: technical, contrarian, financial, historical, user experience.

### Phase 2: Multi-Source Search

Never search once. For thorough research, hit multiple sources:

```
Understanding:  scout "topic"                              (Exa — summaries + content)
Evidence:       scout "topic" --source scholar --after 2024 (Scholar — papers + citations)
Current:        scout "topic" --source news                 (News — what's happening now)
Exact recall:   scout '"term" site:x.com' --source google   (Google — find specific mentions)
Community:      scout "topic" --source hn                   (HN — practitioner opinions)
Users:          scout "topic" --source reddit                (Reddit — real user experiences)
Code:           gh api search/repositories -f q="topic"     (GitHub — implementations)
```

Launch subagents in parallel for independent sub-questions. Each subagent searches 2-3 sources.

### Phase 3: Expand and Extract

After search, expand the most promising results:
- `scout '?abc:1,2,3' --raw` — full text, instant (Exa results have stored text)
- `scout '?abc:1' -c "What are the key findings?"` — Gemini-analyzed
- Token estimates shown on stderr — use to decide read all vs. pick shortest vs. summarize

For Reddit/HN: drill into comment threads for real opinions. Karma badges indicate credibility.

### Phase 4: Gap Analysis (the expert move)

After each round, ask: "What's MISSING?"
- What contradicts what I found?
- What's the strongest counterargument?
- Which claims have only one source?
- What angle haven't I searched yet?

Use Google's "Related searches" and "People also ask" to discover queries you didn't think of.

Run additional targeted searches to fill gaps. Repeat until:
- Core claims are corroborated by 3+ independent sources
- New searches return mostly redundant information
- All sub-questions from planning phase are answered

### Phase 5: Verify

For every important claim:
- Is it supported by 2+ independent sources?
- Who is behind the source? (lateral reading)
- Is the claim accurately represented? (check original, not summary)
- For quantitative claims: trace to primary data
- For community opinions: check karma/credibility of the commenter

Assign confidence:
- HIGH: 2+ independent, credible sources agree
- MEDIUM: 1 reliable source, or 2+ with caveats
- LOW: Single source, or inference from related data
- UNVERIFIED: Stated but not confirmed

### Phase 6: Synthesize

Organize by theme, not by source. Surface contradictions explicitly. Flag uncertainty.

## Patterns That Work

**Broad-to-narrow**: Start with Exa for landscape, then Scholar for rigor, community for reality-check, primary sources for verification.

**Follow the citations**: Google's related searches and "people also ask" reveal adjacent queries. Reddit and HN comments contain links to primary sources. Follow them.

**Reddit discovery via Google**: Reddit's own search is weak. Always use `scout "topic" --source reddit` (which uses Google with site:reddit.com under the hood). Then drill into comment threads.

**Scholar needs specificity**: "AI tutoring effectiveness" returns garbage. "AI tutoring" effectiveness RCT returns actual studies. Auto-quoting helps but specific terms help more.

**HN comment mining**: `--comments` flag searches ALL HN comments globally. Finds hidden gems buried in unrelated threads. Story context (title + ID) shown so you can drill in.

**GitHub for ground truth**: When someone claims "X is possible" or "Y approach works," search GitHub for actual implementations. Code doesn't lie.

**Asymmetric compute**: Use cheap sources (HN, Reddit, Google) for volume discovery. Use Exa for deep content. Reserve Gemini analysis (`-c` flag) for the most important sources only.

## Anti-Patterns

- Searching the same query on every source (wastes tokens, most overlap on top results)
- Using Scholar for broad topics (returns survey papers with 0 citations)
- Using HN for non-tech topics (returns noise)
- Accepting the first plausible answer without cross-referencing
- Running Exa AND Google on the same conceptual query (they overlap — pick one based on need)
- Expanding all results instead of reading token estimates and picking the best 2-3
- Forgetting to check Google's related searches (free follow-up query ideas)
