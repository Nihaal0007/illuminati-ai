# SEO Foundation — Illuminati AI

Snapshot of what's in place for SEO, where it lives, and what's still TODO.
Everything below is on every one of the 12 HTML pages unless noted otherwise.

## What's in place

### Per-page meta (all 12 pages)
- `<title>` — unique per page
- `<meta name="description">` — unique per page, all under 160 chars
- `<link rel="canonical">` — absolute URL to `https://illuminatiai.tech/<page>.html`
- `<meta name="robots" content="index, follow">`
- `<meta name="theme-color" content="#0a0a0a">`
- `<meta name="keywords">` — focused keyword set per page (added in this commit)
- `<meta name="author" content="Illuminati AI">`
- `<meta name="language" content="English">`
- `<link rel="icon" type="image/png" href="assets/logo.png">`
- `<link rel="apple-touch-icon" href="assets/logo.png">`

### Open Graph (all 12 pages)
- `og:type`, `og:site_name`, `og:title`, `og:description`, `og:image`, `og:url`
- `og:image:width` = 1200, `og:image:height` = 630 (added in this commit)
- `og:locale` = `en_US` (added in this commit)

### Twitter Cards (all 12 pages)
- `twitter:card` = `summary_large_image`
- `twitter:title`, `twitter:image`
- `twitter:url` (added in this commit — mirrors `og:url`)
- `twitter:description` (added in this commit — mirrors `og:description`)

### Structured data
- **Organization** JSON-LD on `index.html` — includes `name`, `url`, `logo`,
  `description`, `founder` (Monish Shah), `foundingDate` (2026),
  full `address` (street, locality, region, postal, country), `contactPoint`
  (phone, email, contactType, areaServed), `sameAs` (LinkedIn company page),
  `email` = `illuminati.ai@illuminatiai.tech`
- **WebSite** JSON-LD on `index.html` — `name`, `url`, `publisher`

### Crawler files
- `robots.txt` — explicit allowlist for AI crawlers (`GPTBot`, `ChatGPT-User`,
  `ClaudeBot`, `anthropic-ai`, `PerplexityBot`, `Google-Extended`, `CCBot`,
  `cohere-ai`) plus standard `User-agent: *`, and `Disallow: /api/`, `/admin/`
- `sitemap.xml` — all 11 indexable pages with `lastmod`, `changefreq`,
  `priority` (homepage 1.0, products/services 0.9, faq/how-it-works/contact
  0.8, about 0.7, legal pages 0.3). Uses `.html` URLs to match the canonicals.
- `llms.txt` — present at root for LLM/AEO citation context

### Analytics + Consent
- GA4 (`G-WFK3MFE11M`) with Google Consent Mode v2 — default DENIED for all
  storage types; flipped to GRANTED only on cookie banner Accept All.

### Netlify
- `netlify.toml` does NOT set `pretty_urls`, but Netlify enables it by
  default — clean URLs (`/about`, `/products`, etc.) resolve fine. No action
  needed.

## TODOs

- [ ] **Add `assets/og-image.png`** — currently OG `og:image` points at
  `assets/logo.png`, which works but isn't the recommended 1200×630
  landscape format social platforms prefer. Designing a dedicated
  1200×630 OG card with the brand mark + tagline ("AI agents that work
  while you sleep") would improve link previews on LinkedIn / Twitter /
  Slack / WhatsApp.

- [ ] **Add real social profile URLs to Organization JSON-LD `sameAs`** —
  Currently only the LinkedIn company page is listed. Add Instagram
  (`https://www.instagram.com/illuminati.ai2026/`) and any other public
  profiles (X/Twitter, YouTube, GitHub) when they exist.

- [ ] **Submit `sitemap.xml` to Google Search Console** — go to
  https://search.google.com/search-console → add `illuminatiai.tech`
  property → Sitemaps → submit `https://illuminatiai.tech/sitemap.xml`.

- [ ] **Submit to Bing Webmaster Tools** — same URL, same flow,
  https://www.bing.com/webmasters.

- [ ] **Refresh `sitemap.xml` lastmod dates** when content changes (current
  values are `2026-05-12`, the date the file was last regenerated).

- [ ] **Consider per-page JSON-LD** — currently only the homepage has
  structured data. Adding `BreadcrumbList` + `WebPage` schemas to other
  pages would help Google understand the site hierarchy. Optional, not
  urgent.

- [ ] **Consider `Service` schema on `services.html`** and `Product` schema
  on `products.html` for Creator OS once it launches. Improves rich-result
  eligibility.
