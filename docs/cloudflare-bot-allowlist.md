# Cloudflare bot allowlist for vibe.pub

The default Cloudflare bot fight settings return **403** to AI crawlers
(GPTBot, ClaudeBot, Perplexity, etc.). This blocks LLM agents from reading
public pages. We want public pages indexable; only `/api/` and `/auth/` should
be bot-protected.

## Verifying the symptom

```bash
curl -sI -A "ClaudeBot/1.0" https://vibe.pub/<any-public-slug>
# Without allowlist: HTTP/2 403
# With allowlist:    HTTP/2 200
```

## Fix (Cloudflare dashboard)

1. **Cloudflare → vibe.pub zone → Security → Bots**
   - If "Super Bot Fight Mode" is on: set **Verified bots** to *Allow*.
   - Set **Definitely automated** to *Allow* (or *Managed challenge* — but
     *Allow* is what lets AI bots through; many AI UAs are flagged
     "definitely automated").
   - **AI Scrapers and Crawlers** (the dedicated toggle): set to **Allow**.

2. **Security → WAF → Custom rules** — add a rule:
   - **Name**: `allow-ai-bots`
   - **Expression**:
     ```
     (cf.client.bot) or
     (http.user_agent contains "GPTBot") or
     (http.user_agent contains "ChatGPT-User") or
     (http.user_agent contains "OAI-SearchBot") or
     (http.user_agent contains "ClaudeBot") or
     (http.user_agent contains "Claude-Web") or
     (http.user_agent contains "anthropic-ai") or
     (http.user_agent contains "PerplexityBot") or
     (http.user_agent contains "Perplexity-User") or
     (http.user_agent contains "Google-Extended") or
     (http.user_agent contains "Applebot-Extended") or
     (http.user_agent contains "CCBot") or
     (http.user_agent contains "cohere-ai") or
     (http.user_agent contains "Meta-ExternalAgent") or
     (http.user_agent contains "Bytespider") or
     (http.user_agent contains "YouBot")
     ```
   - **Action**: `Skip` → check **All remaining custom rules**, **Bot Fight Mode**,
     **Rate limiting rules**, **Managed Rules**.
   - Place this rule **above** any block/challenge rules.

3. (Optional) Restrict the skip to public read paths so bots still can't hit
   `/api/` or `/auth/`:
   ```
   (http.request.uri.path ne "/api/") and
   (not starts_with(http.request.uri.path, "/api/")) and
   (not starts_with(http.request.uri.path, "/auth/")) and
   (...the UA expression above...)
   ```

## Verification after change

```bash
for ua in "GPTBot" "ClaudeBot/1.0" "anthropic-ai" "PerplexityBot"; do
  echo "== $ua =="
  curl -sI -A "$ua" https://vibe.pub/llms.txt | head -1
done
```

All should return `HTTP/2 200`.

## Why robots.txt alone isn't enough

`robots.txt` is an honor-system signal. Cloudflare Bot Fight Mode operates at
L7 (UA + heuristics) and returns 403 before the request reaches the origin —
robots.txt never gets read. Both layers must be permissive.
