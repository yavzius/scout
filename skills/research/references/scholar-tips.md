# Scholar Search Strategies

## The problem with Scholar

Broad queries return bibliometric surveys with 0 citations. The actual important papers get buried.

## What works

**Be specific.** Auto-quoting helps (scout quotes the first 2 words), but specific terms matter more.

Bad: `AI tutoring effectiveness`
Good: `"AI tutoring" effectiveness RCT`
Best: `"AI tutoring" randomized controlled trial --after 2024`

**Add method terms.** Words like RCT, meta-analysis, systematic review, longitudinal tell Scholar you want rigorous studies.

**Use author names.** If you know a key researcher: `"Kapur" productive failure mathematics`

**Use `--after YEAR`.** Filters out old papers. Scholar's own date filter is unreliable — scout also filters client-side.

## Reading Scholar results

Each result shows: year, citation count, snippet.

Citation count is your best signal:
- >100: foundational work, widely accepted
- 10-100: established, peer-reviewed
- 1-10: recent or niche but vetted
- 0: just published, preprint, or low-impact

A 2025 paper with 0 citations may be excellent but unverified. A 2016 paper with 730 citations is near-certain.

## Combining Scholar with other sources

1. Start with Exa or Google to find the landscape
2. Identify key terms, author names, specific claims
3. Use those specific terms in Scholar to find the primary research
4. Expand the most-cited papers via `scout '?abc:1' --raw`

## Example: researching "does spaced repetition work for math"

```bash
# Step 1: landscape via Exa
scout "spaced repetition mathematics effectiveness"

# Step 2: specific Scholar search using terms from step 1
scout "spaced repetition mathematics randomized" --source scholar --after 2020

# Step 3: find the foundational paper by the researcher who keeps appearing
scout "Kapur productive failure" --source scholar
```
