---
title: 'Eleventy Baseline'
slug: 'home'
description: 'Eleventy Baseline is a build framework for Eleventy. Assets, head tags, sitemaps and structured data, ready on the first build.'
date: 2026-05-17
permalink: '/'
translationKey: homepage
layout: 'layouts/home.njk'
---

<small><a href="/release-notes">v{{ _baseline.version }} rolled out</a></small>

# The build framework for Eleventy sites.

{{ settings.languages[lang].tagline }} {style="--flow-space-heading:0.5em"}

Eleventy is a static site generator that leaves the structural decisions to you. Most Eleventy projects end up making the same ones: asset pipeline, images, SEO, structured data, multilingual support, sitemaps and deployment glue.

Baseline is those decisions already implemented and fitted together in one plugin, following Eleventy's own conventions. A framework in what it decides, a plugin in how it installs.

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

The asset pipeline, wired. One entry point per directory (`index.css`, `index.js`), CSS through PostCSS and JS through esbuild. Images render at the right widths in modern formats, lazy by default.

### SEO

The head tags fill from one settings file, with page-level overrides where needed. Beyond the basics, `<baseline-head>` emits a JSON-LD structured-data graph, Open Graph, Twitter Cards, and a canonical link, with no per-page wiring.

The structured-data construction follows the model of `seo-graph-core`, by Joost de Valk of Yoast.

### Multilingual

Directory-based multilingual support: per-language collections, translation mapping, hreflang, and i18n filters. Multilingual sites get per-language sitemaps plus an index.

---

## Built on standards and conventions

Baseline sits on Eleventy rather than around it. The data cascade, the template languages and the plugin API stay exactly as documented, so what you already know still applies. Markdown and front matter are the source of truth, Nunjucks where a page needs logic. HTML first, then CSS, then JavaScript where the page earns it.

Baseline does not prescribe components, a CSS methodology or a frontend framework, and it ships no client-side runtime.

[Eleventy](https://www.11ty.dev/) · [[image-shortcode | eleventy-img]] · [[content-helpers | Markdown]] · [[globals | Nunjucks]] · [[assets-pipeline | PostCSS]] · [[assets | esbuild]]

---

## One content graph underneath

Backlinks, wikilinks that survive a folder move, breadcrumbs and structured data all come from the same underlying content graph.

Without it you maintain each of those by hand: a backlinks index built from filenames, a table of contents re-parsed from Markdown, structured data written page by page. All of it drifting the moment you rename a file.

Baseline reads the HTML after it renders, so the graph is always what you actually shipped.

---

## Running on Baseline

The site you are reading runs on Baseline. What you are looking at is the system itself in use, not a demonstration site.

Open any docs page: the table of contents is built from the rendered HTML, the "Linked from" footer reads the content graph, and the structured data in the head is that same graph, projected for search engines.

View source. Browse the repo. Run it locally. It's visible.

[[about | Read the longer story behind it]].

---

## Open source

Baseline is MIT-licensed and free, developed in the open and maintained by [a pleasant view](https://www.apleasantview.com).

[[commercial-support | Commercial support]] is available directly from the maintainer.

## Rolling releases

Baseline ships continuously. Each release advances the work, marked `0.1.0-next.X`. Breaking changes arrive with the line you have to change, written out in the [release notes](/release-notes/). Pin a version when you build something serious on top.

If something in the docs claims a behaviour you cannot reproduce, the docs are probably wrong. Please [open an issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues).
