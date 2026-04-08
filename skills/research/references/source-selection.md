# Source Selection Guide

## Decision tree

What kind of answer do you need?

**"What is X? How does it work?"** → Exa (default). Returns AI summaries with full stored content.

**"Find where X is mentioned"** → Google (`--source google`). Best index depth, supports `site:` and `"exact phrases"`.

**"What does the research say?"** → Scholar (`--source scholar`). Use specific terms. Add `--after YEAR` for recent work.

**"What happened recently?"** → News (`--source news`). Timestamped, source-attributed.

**"What do practitioners/devs think?"** → HN (`--source hn`). Short simple queries work best. Non-tech topics return noise.

**"What do real users/parents/consumers think?"** → Reddit (`--source reddit`). Uses Google under the hood for discovery, then Reddit API for comments.

**"Does an implementation exist?"** → GitHub (`gh api search/repositories`). Code doesn't lie.

## When sources overlap

Exa and Google overlap on the top 1-2 results for most queries. Don't run both on the same broad query. Pick based on need:
- Need summaries + stored content → Exa
- Need exact match + site filter + related searches → Google

## When to use multiple sources

Thorough research needs multiple angles. But don't run the same query on every source. Instead:
- Different sub-questions go to different sources
- Same topic, different angle: Exa for understanding, Scholar for evidence, Reddit for sentiment
- Cross-reference: find claim via Exa, verify via Scholar, reality-check via Reddit/HN

## Source limitations

- **Exa**: weak at finding specific terms buried in comment threads. Smaller index than Google.
- **Google**: returns snippets not summaries. No stored content — need extract step for full text.
- **Scholar**: broad queries return useless survey papers. Always use specific terms.
- **News**: only recent. No historical depth.
- **HN**: tech-only. Education, health, finance topics return noise.
- **Reddit**: great for consumer topics, weak for technical/academic.
- **GitHub**: no explanation of why, only what. Code may be abandoned.
