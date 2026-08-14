---
title: 'Eleventy Baseline'
slug: 'home'
description: 'Eleventy Baseline is a build framework for Eleventy. Assets, head tags, sitemaps and structured data, ready on the first build.'
date: 2026-05-17
permalink: '/'
translationKey: homepage
layout: 'layouts/home.njk'
---

<div class="c-breadcrumbs"><a href="/release-notes/">v{{ _baseline.version }} shipped</a></div>

# The build framework for Eleventy sites.

{{ settings.languages[lang].tagline }} {style="--flow-space-heading:0.5em"}

Eleventy is a static site generator that leaves the structural decisions to you. Most Eleventy projects end up making the same ones: an asset pipeline, images, head tags, structured data, multilingual support, sitemaps.

Baseline is those decisions already made and fitted together in one plugin, following Eleventy's own conventions. A framework in what it decides, a plugin in how it installs.

---

## Install and start

```bash
npm install @11ty/eleventy @11ty/eleventy-img
npm install @apleasantview/eleventy-plugin-baseline
```

Install the packages, register Baseline in your Eleventy config, and run the dev server. The [[quickstart | quickstart]] walks through the full setup.

If you are new to Eleventy, the [[introduction | introduction chapter]] will get you on your way.

---

## What you get

### Assets

The asset pipeline, wired. One entry point per asset directory: `index.css` runs through PostCSS, `index.js` through esbuild. Images render at the right widths in modern formats, lazy by default.

### SEO

The head tags fill from one settings file, with page-level overrides where needed. `<baseline-head>` emits a canonical link, Open Graph, Twitter Cards and a JSON-LD structured-data graph, with no per-page wiring.

The structured-data construction follows the model of `seo-graph-core`, by Joost de Valk of Yoast.

### Multilingual

Directory-based multilingual support: per-language collections, translation mapping, hreflang, and i18n filters. Sitemaps come per language, with an index on top.

---

## One content graph underneath

Backlinks, wikilinks that survive a folder move, breadcrumbs and the structured data in the head are all projections of one content graph.

Without it, each of those is a thing you maintain by hand: a backlinks index built from filenames, a table of contents re-parsed from Markdown, structured data written page by page. All of it drifting the moment you rename a file.

Baseline builds that graph from the HTML after it renders, so it is always what you actually shipped.

---

## Built on standards and conventions

Baseline sits on Eleventy rather than around it. The data cascade, the template languages and the plugin API stay exactly as documented, so what you already know still applies. Markdown and front matter are the source of truth, Nunjucks where a page needs logic. HTML first, then CSS, then JavaScript where the page earns it.

Baseline does not prescribe components, a CSS methodology or a frontend framework, and it ships no client-side runtime.

Under the hood: [Eleventy](https://www.11ty.dev/) · [[image-shortcode | eleventy-img]] · [[content-helpers | Markdown]] · [[globals | Nunjucks]] · [[assets-pipeline | PostCSS]] · [[assets | esbuild]]

---

## Running on Baseline

The site you are reading runs on Baseline. Open any docs page: the table of contents is built from the rendered HTML, the "Linked from" footer reads the content graph, and the structured data in the head is that same graph, projected for search engines.

View source. Browse the repo. Run it locally.

[[about | Read the longer story behind it]].

---

## Open source

Baseline is MIT-licensed and free, developed in the open and maintained by [a pleasant view](https://www.apleasantview.com).

For community support and questions about Eleventy itself, join the [Eleventy Discord](https://www.11ty.dev/blog/discord/) server.

[[commercial-support | Commercial support]] is available directly from the maintainer.

## Rolling releases

Baseline ships continuously. Each release advances the work, marked `0.1.0-next.X`. Breaking changes arrive with the line you have to change, written out in the [release notes](/release-notes/). Pin a version when you build something serious on top.

For bugs or doc errors, Please [open an issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues). If something in the docs claims a behaviour you cannot reproduce, the docs are probably wrong. 
