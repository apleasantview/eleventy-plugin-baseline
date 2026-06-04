# Release notes

What changed in `@apleasantview/eleventy-plugin-baseline`. A rolling file: it
carries the release being prepared, and clears with each release to start fresh
on the next one. The full history is in the git log.

Baseline ships on a rolling release cadence (`0.1.0-next.X`). Things shift,
break, and get renamed between releases. Where a change needs you to do
something, the line you have to change is right there with it.

---

## 0.1.0-next.42

Mostly an SEO release. `<baseline-head>` now emits the structured data, social
tags, and canonical link that used to be hand-wired per site. A handful of
shapes changed to make room for it.

### Breaking

- **Content graph edges dropped `type`.** It only ever mirrored `internal`, so
  read that instead: `!edge.internal` where you had `edge.type === 'external'`,
  `edge.internal` where you had `edge.type === 'link'`. Edges now carry `rel`,
  the link's `rel` tokens as a lowercased array, for link-audit and SEO use.
- **Authored SEO identity moved.** `_data/seo.js` is now `_data/schema.js`, and
  its cascade key `seo` is now `schema`. Site-wide SEO defaults (`ogImage`,
  Open Graph, Twitter) live under `settings.seo`. Rename the file and the key,
  move the defaults across.
- **`page.locale` is a string now.** It used to be an object; it is a BCP 47
  tag (`'en-US'`). The three values it held are top-level: `page.lang` (the
  short code), `page.translationKey`, and `page.isDefaultLang`. In settings,
  `settings.languages.<code>` gains a `locale` field and drops `languageCode`.
  Update any template reading `page.locale.lang` to `page.lang`, and the same
  for `.translationKey` / `.isDefaultLang`.
- **Graph membership gates on `_internal`, not `eleventyExcludeFromCollections`.**
  A page kept out of collections can now appear in the graph, which is usually
  what you want. To keep a page out of the graph, set
  `baselineExcludeFromGraph: true` (or `_internal: true` for synthetic
  templates).
- **JSON-LD `@id`s are keyed on the canonical URL.** Per-page and corpus graphs
  moved together, so they stay internally consistent. Any external consumer
  keyed on the old `#webpage` fragments needs re-keying.

### Added

- **`<baseline-head>` emits the SEO surface.** With no per-site wiring, the head
  now writes:
  - a JSON-LD `@graph`: WebSite, Organization or Person, WebPage, Article,
    BreadcrumbList, with translation links between language versions
  - Open Graph and Twitter Card meta tags
  - the canonical link (omitted on noindex pages)

  Identity comes from `_data/schema.js` and `settings.seo`. Per page, `pageType`
  and `articleType` override the schema `@type`, and `ogImage` sets the share
  image (the object form `{ url, width, height, alt }` emits a dimensioned
  image). Keep social image URLs absolute: the graph sits in a script tag the
  base-URL transform can't reach.
- **`node.sections` on the content graph.** Each node now carries `sections`,
  one `{ heading, text }` record per H2. Heading-and-prose pairs make FAQPage,
  HowTo, and Speakable schemas derivable without re-parsing the rendered HTML.
- **Breadcrumbs.** Each content-graph node carries a `breadcrumbs` trail built
  from its section path, and Baseline emits a matching `BreadcrumbList` in the
  page's JSON-LD. Nothing to wire.
- **`datePublished` and `dateModified` front-matter keys.** Optional. Baseline
  resolves a publish/modified chain for the structured data (front matter, then
  the git last-commit date, then `page.date`). Sites that set neither are
  unchanged.
- **Configurable title templates.** New `head.titleTemplate` option and a
  per-page `titleTemplate`. Tokens: `%s` (the page title), `%siteTitle%`,
  `%tagline%`. Set it to `null` on a page for a bare title. With no template
  set, the old `Page - Site` composition is reproduced exactly.
- **`topics` front matter for keywords.** Lists in `topics` emit schema.org
  `keywords` (and `og:article:tag` on articles). Separate from Eleventy's
  `tags`, which stays untouched. Bring your own taxonomy.
- **`settings.defaultLocale`.** Set a BCP 47 site default (e.g. `'en-US'`) as the
  preferred site-default key; `defaultLanguage` stays valid as its short-code
  alias. Either one activates multilingual mode.

### Fixed

- Same-host links with different `rel` (a `preconnect` and a `dns-prefetch` to
  one host) are no longer collapsed to one in the head.
- The sitemap and the markdown alternates skip `permalink:false` records
  instead of throwing on them.
- An object-form page-level `seo.ogImage` now also emits a JSON-LD ImageObject,
  not just the `og:image` tag, so the graph and the social tag share one image.

### Reading list

Where to go deeper on the surfaces that changed.

**SEO**

- [The head module](https://www.eleventy-baseline.dev/docs/module/head/)
- [Site settings](https://www.eleventy-baseline.dev/docs/core-reference/site-settings/)
- [Custom schema](https://www.eleventy-baseline.dev/docs/feature-guide/custom-schema/)

**Content graph**

- [The reference](https://www.eleventy-baseline.dev/docs/core-reference/content-graph/)
- [Globals](https://www.eleventy-baseline.dev/docs/core-reference/globals/)
- [The navigator module](https://www.eleventy-baseline.dev/docs/module/navigator/)

**Multilingual**

- [The multilang module](https://www.eleventy-baseline.dev/docs/module/multilang/)
- [Filters](https://www.eleventy-baseline.dev/docs/core-reference/filters/)
