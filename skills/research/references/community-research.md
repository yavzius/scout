# Community Research: Reddit and HN

## Reddit

### How it works
`--source reddit` uses Google with `site:reddit.com` for discovery (Reddit's own search is terrible), then Reddit's JSON API for comments. This is why it finds niche terms that Reddit search misses.

### Finding threads
```bash
scout "Lalilo" --source reddit --num 10
scout "Alpha School" --source reddit --subreddit AustinParents
```

### Drilling into comments
Results include a permalink: `reddit:/r/sub/comments/id/slug/`
```bash
scout "reddit:/r/AustinParents/comments/1o0hv4s/alpha_school_updated_thoughts/" --source reddit --num 15
```

Comments show:
- Author name with credibility badge (* = 5K+ karma, ** = 50K+)
- Comment score (upvotes)
- Full comment text inline

### Subreddit selection matters
Wrong subreddit = wrong audience. Examples:
- r/reading is about Reading, UK — not literacy
- r/Teachers for teacher perspectives
- r/homeschool for parent perspectives
- r/LocalLLaMA for local AI opinions
- r/edtech for education technology

### What Reddit is best for
- "What do parents/teachers/users actually think about X?"
- Real experiences with products/tools
- Consumer sentiment that doesn't appear in marketing or press
- Finding specific criticisms that get buried on official review sites

## HackerNews

### Story search
```bash
scout "topic" --source hn --num 10
scout "topic" --source hn --days 30   # recent only
```
Use SHORT simple queries. "Khan Academy" works. "Khan Academy AI tutoring effectiveness evaluation" returns garbage.

### Comment search (the hidden gem)
```bash
scout "Alpha School" --source hn --comments --num 15
```
This searches ALL HN comments globally. Finds mentions in unrelated threads — someone discussing Alpha School in a thread about "Students Are Being Treated Like Guinea Pigs."

Each comment shows:
- Which story it belongs to (title + ID)
- Author with karma badge
- Full comment text

### Drilling into story comments
```bash
# Top comments, ranked by HN (best first — uses Firebase API)
scout "hn:47050215" --source hn --num 10

# Filtered to specific topic within that thread
scout "hn:47050215 data privacy" --source hn --num 10
```

Without a keyword filter: returns HN's own ranking (most upvoted/replied). Best for "what did the community think?"

With a keyword filter: returns comments matching that term within the story. Best for "what did people say about X specifically?"

### What HN is best for
- Tech/startup community opinions on products, tools, companies
- Critical analysis from experienced developers
- Finding the contrarian take on a popular narrative
- Early signal on new tools/frameworks

### What HN is bad for
- Non-tech topics (education, health, finance return noise)
- Small or niche products (not enough HN coverage)
