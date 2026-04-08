# Verification Patterns

## The core rule
Never present a claim at HIGH confidence from a single source. The minimum for HIGH is 2+ independent, credible sources that agree.

## Lateral reading
Don't evaluate a source by reading it deeply. Instead, LEAVE the source quickly and check it from outside:
- Who published this? What's their incentive?
- Do other credible sources cite or reference this?
- Is this a primary source or someone summarizing someone else?

## Cross-referencing across sources

**Best pattern for verifying a claim:**
1. Find the claim via Exa or Google
2. Check Scholar for academic evidence supporting or contradicting it
3. Check community (HN/Reddit) for practitioner experience
4. If quantitative: trace to the primary data source

**Example: "AI tutoring doubles learning gains"**
```bash
# Found claim in an Exa result. Verify:
scout "AI tutoring doubles learning" --source scholar --after 2024
# → Found: Harvard RCT (Ponti 2025, cited 125x) — confirms 0.73-1.3 SD improvement
# → Also found: Turkish study showing 17% decline when AI removed
# Verdict: MEDIUM — works under specific conditions, not universal
```

## Credibility signals by source

| Source | Strong signal | Weak signal |
|--------|--------------|-------------|
| Scholar | >100 citations, published in known journal | 0 citations, preprint |
| HN | ** (10K+ karma), many replies | New account, 0 points |
| Reddit | ** (50K+ karma), high score, specific experience | New throwaway, vague claims |
| Google | .gov, .edu, known publications | SEO blogs, content farms |
| Exa | Published in known outlet, named author | Undated, anonymous, promotional |

## What to do with contradictions

Don't resolve contradictions — surface them. Report both sides:
- "Source A (Harvard RCT, N=194) found X"
- "Source B (Turkish study, N=60) found Y"
- "The difference may be because: [conditions, methodology, population]"

Contradictions are the most valuable part of research. They show where certainty breaks down.

## Confidence levels

| Level | Criteria | Action |
|-------|----------|--------|
| HIGH | 2+ independent, credible sources agree | State as finding |
| MEDIUM | 1 reliable source, or 2+ with caveats | State with caveat |
| LOW | Single non-expert source, or inference | Flag explicitly |
| UNVERIFIED | Claimed but no supporting evidence found | Say "could not verify" |

## Red flags
- Source is the only one making this claim
- Source has obvious financial incentive (vendor claiming their product works)
- Numbers without methodology ("our students score 99th percentile" — of what? compared to whom?)
- Community consensus without evidence (popular Reddit opinion ≠ truth)
- Circular citations (A cites B, B cites A, no primary data)
