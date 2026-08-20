---
title: 'Eleventy Baseline'
slug: 'home'
description: 'Eleventy Baseline is a build framework for Eleventy. Assets, head tags, sitemaps and structured data, ready on the first build.'
date: 2026-05-17
permalink: '/'
translationKey: homepage
layout: 'layouts/home.njk'
---

<div class="reveal-stagger u-flow">

<div class="c-breadcrumbs" style="--i: 1;"><a href="/release-notes/">v{{ _baseline.version }} shipped</a></div>

<div class="u-flow" style="--i: 1;">

# The build framework for Eleventy sites.

{{ settings.languages[lang].tagline }} {style="--flow-space-heading:0.5em"}

Eleventy is a static site generator that leaves the structural decisions to you. Most Eleventy projects end up making the same ones: an asset pipeline, images, head tags, structured data, multilingual support, sitemaps.

Baseline is those decisions already made and fitted together in one plugin, following Eleventy's own conventions. A framework in what it decides, a plugin in how it installs.

</div>

---

<div class="u-flow" style="--i: 2;">

## Install and start

```bash
npm install @11ty/eleventy
npm install @apleasantview/eleventy-plugin-baseline
```

Install the packages, register Baseline in your Eleventy config, and run the dev server. The [[quickstart | quickstart]] walks through the full setup.

Rather build it than read about it? The [[tutorial | tutorial]] starts from an empty folder and ends with a homepage, a page, a post and a second language, explaining each decision as it makes it.

If you are new to Eleventy, the [[introduction | introduction chapter]] will get you on your way.

</div>

---

<div class="u-flow" style="--i: 3;">

## Built on standards and conventions

Baseline sits on Eleventy rather than around it. The data cascade, the template languages and the plugin API stay exactly as documented, so what you already know still applies. Markdown and front matter are the source of truth, Nunjucks where a page needs logic. HTML first, then CSS, then JavaScript where the page earns it.

Baseline does not prescribe components, a CSS methodology or a frontend framework, and it ships no client-side runtime.

Under the hood: [Eleventy](https://www.11ty.dev/) · [[image-shortcode | eleventy-img]] · [[content-helpers | Markdown]] · [[globals | Nunjucks]] · [[assets-pipeline | PostCSS]] · [[assets | esbuild]]

</div>

---

<div class="u-flow" style="--i: 4;">

## Running on Baseline

The site you are reading runs on Baseline. Open any docs page: the table of contents is built from the rendered HTML, the "Linked from" footer reads the content graph, and the structured data in the head is that same graph, projected for search engines.

View source. Browse the repo. Run it locally.

[[about | Read the longer story behind it]].

</div>

---

<div class="u-flow" style="--i: 5;">

## Open source

Baseline is MIT-licensed and free, developed in the open and maintained by [a pleasant view](https://www.apleasantview.com).

For community support and questions about Eleventy itself, join the [Eleventy Discord](https://www.11ty.dev/blog/discord/) server.

[[commercial-support | Commercial support]] is available directly from the maintainer.

</div>

---

<div class="u-flow" style="--i: 6;">

## Rolling releases

Baseline ships continuously. Each release advances the work, marked `0.1.0-next.X`. Breaking changes arrive with the line you have to change, written out in the [release notes](/release-notes/). Pin a version when you build something serious on top.

For bugs or doc errors, Please [open an issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues). If something in the docs claims a behaviour you cannot reproduce, the docs are probably wrong.

</div>

</div>
