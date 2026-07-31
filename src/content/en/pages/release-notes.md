---
title: 'Release notes'
slug: 'release-notes'
description: 'Baseline ships on a rolling release cadence (0.1.0-next.X). Every entry names what changed and the line you have to change with it.'
date: '2026-06-04'
version: '0.1.0-next.44'
released: '2026-07-04'
layout: 'layouts/docs.njk'
---

{% deckBlock %}

Baseline ships on a rolling release cadence (`0.1.0-next.X`). Things shift, break, and get renamed between releases. Pin a version when you build something serious on top.

Install from npm:  
`npm install @apleasantview/eleventy-plugin-baseline --save-exact`

{% enddeckBlock %}

## v0.1.0-next.44

A housekeeping release: the supported Node range and the dependency versions Baseline declares.

---

### Changed

{% stepsBlock 'compact' %}

- **Node 22 is the floor now.**

  `engines` moved from `>=20` to `>=22`, because Node 20 reached end-of-life in April 2026. If you are on Node 20 or 21, move to 22 or 24 (both current LTS). Nothing in the plugin needs syntax newer than Node 22 already has; this is about not advertising a dead line.

- **Internal dependencies advanced to match what Baseline is built on.**

  Most notably `postcss-preset-env` (10 to 11) and `markdown-it-attrs` (4 to 5). The versions the plugin declares now match the ones its own docs site has been building on, so what ships is what gets tested. If you pin Baseline's transitive dependencies yourself, note the two majors; otherwise there is nothing to do.

{% endstepsBlock %}

---

## v0.1.0-next.43

A single fix: wikilinks on single-language sites.

---

### Fixed

- Wikilinks (`[[slug]]`) now resolve on single-language sites. Slug registration was gated on a multilang-only flag, so a site with no `languages` configured registered nothing and every wikilink rendered as literal text. Nothing to change on your end; they just work now.

---

## v0.1.0-next.42

Mostly an SEO release. `<baseline-head>` now emits the structured data, social tags, and canonical link that used to be hand-wired per site. A handful of shapes changed to make room for it.

---

### Breaking

{% stepsBlock 'compact' %}

- **If you hand-wired SEO, unplug it first.**

  `<baseline-head>` now emits the JSON-LD graph, Open Graph, Twitter, and canonical itself (see Added).

  If your site still injects its own, the two coexist rather than replace, so remove your hand-wired SEO from the cascade and let the plugin own it.
  - _Symptom: two `<script type="application/ld+json">` blocks in one `<head>`_.

- **Content graph edges dropped `type`.**

  It only ever mirrored `internal`, so read that instead: `!edge.internal` where you had `edge.type === 'external'`, `edge.internal` where you had `edge.type === 'link'`.

  Edges now carry `rel`, the link's `rel` tokens as a lowercased array, for link-audit and SEO use.

- **The SEO identity file moved.**

  If you kept site identity (`organization` / `person`) in `_data/seo.js`, rename the file to `_data/schema.js` and its cascade key from `seo` to `schema`. Site-wide SEO defaults (`ogImage`, Open Graph, Twitter) now live under `settings.seo`. This is only the identity.

  The per-page `seo:` presentation keys (`seo.title`, `seo.description`, `seo.ogImage`, `seo.canonical`, and the rest) are unchanged and stay under `seo`. Rename those to `schema` and your title and description overrides go silently empty.

- **`page.locale` is a string now.**

  It used to be an object; it is a BCP 47 tag (`'en-US'`). The three values it held are top-level: `page.lang` (the short code), `page.translationKey`, and `page.isDefaultLang`.

  In settings, `settings.languages.<code>` gains a `locale` field and drops `languageCode`. Update any template reading `page.locale.lang` to `page.lang`, and the same for `.translationKey` / `.isDefaultLang`.

  The content-graph node flattened identically: `node.locale` is a string, with `node.lang`, `node.translationKey`, and `node.isDefaultLang` top-level.
  - _Symptom: `og:locale` or `inLanguage` falling back to the site default on a non-default-language page._

- **Graph membership gates on `_internal`, not `eleventyExcludeFromCollections`.**

  A page kept out of collections can now appear in the graph, which is usually what you want.

  To keep a page out of the graph, set `baselineExcludeFromGraph: true` (or `_internal: true` for synthetic templates).

  Audit any page that used `eleventyExcludeFromCollections` alone to stay out of the graph (404s, utility pages): they now reach the graph and the JSON-LD corpus until you add the flag.
  - _Symptom: a 404 or utility page in `_navigator.nodes` or emitting its own WebPage JSON-LD._

- **JSON-LD `@id`s are keyed on the canonical URL.**

  Per-page and corpus graphs moved together, so they stay internally consistent. Any external consumer keyed on the old `#webpage` fragments needs re-keying.

{% endstepsBlock %}

---

### Added

{% stepsBlock 'compact' %}

- **`<baseline-head>` emits the SEO surface.**

  With no per-site wiring, the head now writes:
  - a JSON-LD `@graph`: WebSite, Organization or Person, WebPage, Article, BreadcrumbList, with translation links between language versions
  - Open Graph and Twitter Card meta tags
  - the canonical link (omitted on noindex pages)

  The graph construction is an adapter to Joost de Valk's [`@jdevalk/seo-graph-core`](https://www.npmjs.com/package/@jdevalk/seo-graph-core).

  Identity comes from `_data/schema.js` and `settings.seo`. Per page, `pageType` and `articleType` override the schema `@type`, and `ogImage` sets the share image (the object form `{ url, width, height, alt }` emits a dimensioned image). Keep social image URLs absolute: the graph sits in a script tag the base-URL transform can't reach.

- **`node.sections` on the content graph.**

  Each node now carries `sections`, one `{ heading, text }` record per H2. Heading-and-prose pairs make FAQPage, HowTo, and Speakable schemas derivable without re-parsing the rendered HTML.

- **Breadcrumbs.**

  Each content-graph node carries a `breadcrumbs` trail built from its section path, and Baseline emits a matching `BreadcrumbList` in the page's JSON-LD. Nothing to wire.

- **`datePublished` and `dateModified` front-matter keys.**

  Optional. Baseline resolves a publish/modified chain for the structured data (front matter, then the git last-commit date, then `page.date`). Sites that set neither are unchanged.

- **Configurable title templates.**

  New `head.titleTemplate` option and a per-page `titleTemplate`. Tokens: `%s` (the page title), `%siteTitle%`, `%tagline%`. Set it to `null` on a page for a bare title. With no template set, the old `Page - Site` composition is reproduced exactly.

- **`topics` front matter for keywords.**

  Lists in `topics` emit schema.org `keywords` (and `og:article:tag` on articles). Separate from Eleventy's `tags`, which stays untouched. Bring your own taxonomy.

- **`settings.defaultLocale`.**

  Set a BCP 47 site default (e.g. `'en-US'`) as the preferred site-default key; `defaultLanguage` stays valid as its short-code alias. Either one activates multilingual mode.

{% endstepsBlock %}

---

### Fixed

- Same-host links with different `rel` (a `preconnect` and a `dns-prefetch` to one host) are no longer collapsed to one in the head.
- The sitemap and the markdown alternates skip `permalink:false` records instead of throwing on them.
- An object-form page-level `seo.ogImage` now also emits a JSON-LD ImageObject, not just the `og:image` tag, so the graph and the social tag share one image.

---

### Reading list

Where to go deeper on the surfaces that changed.

**SEO**

- [[seo-graph|SEO graph reference]]
- [[custom-schema|Custom schema]]
- [[head|The head module]]
- [[site-settings|Site settings]]

**Content graph**

- [[content-graph|Content graph reference]]
- [[navigator|The navigator module]]
- [[globals|Globals]]

**Multilingual**

- [[multilang|The multilang module]]
- [[filters|Filters]]
