---
title: "Documentation"
description: "Documentation for Eleventy Plugin Baseline"
permalink: "/docs/"
slug: "docs"
layout: "layouts/page.njk"
topicSlug: "introduction"
topicTitle: "Introductions"
---

## Overview
Eleventy Baseline is an experimental, optional toolkit for Eleventy. It bundles the pieces you tend to wire on every project—assets, head/meta, images, debugging, and sitemap—without turning into a framework.

{% alertBlock "warning" %}
Work in progress: APIs and defaults may shift as this project evolves.
{% endalertBlock %}

## Quick start
- Quickstart (checklist): [Docs Quickstart](/docs/quickstart/)
- Build from scratch: [Build a Simple Baseline Site](/docs/tutorials/build-a-simple-baseline-site/)
- Add to an existing site: [Integrate Baseline with Eleventy Base Blog](/docs/how-to/integrate-baseline-with-eleventy-base-blog/)
- Set correct URLs: [Deployment URL Checks](/docs/tutorials/deployment-url-checks/)

## Tutorials (learn)
- [Build a Simple Baseline Site](/docs/tutorials/build-a-simple-baseline-site/)
- [Assets Pipeline Quickstart](/docs/tutorials/assets-pipeline-quickstart/)
- [Head & SEO Basics](/docs/tutorials/head-seo-basics/)
- [Sitemaps & Drafts](/docs/tutorials/sitemaps-and-drafts/)
- [Image Shortcode Basics](/docs/tutorials/image-shortcode-basics/)
- [Build a Multilingual Baseline Site](/docs/tutorials/build-a-multilingual-baseline-site/)
- [Custom Social Previews](/docs/tutorials/custom-social-previews/)
- [More tutorials](/docs/tutorials/)

## How-To’s (recipes)
- [Social Previews Checklist](/docs/how-to/social-previews-checklist/)
- [Custom PostCSS Config](/docs/how-to/custom-postcss-config/)
- [Custom Esbuild Targets](/docs/how-to/custom-esbuild-targets/)
- [Deploy Under a Subpath](/docs/how-to/deploy-under-a-subpath/)
- [Image Transform](/docs/how-to/image-transform/)
- [Multilingual Index](/docs/how-to/multilingual-index/)
- [CI/Publish Checklist](/docs/how-to/ci-publish-checklist/)
- [Integrate Baseline with Eleventy Base Blog](/docs/how-to/integrate-eleventy-base-blog/)

## Modules (references)
- [assets-core](/docs/modules/assets-core/)
- [assets-postcss](/docs/modules/assets-postcss/)
- [assets-esbuild](/docs/modules/assets-esbuild/)
- [head-core](/docs/modules/head-core/)
- [multilang-core](/docs/modules/multilang-core/)
- [navigator-core](/docs/modules/navigator-core/)
- [sitemap-core](/docs/modules/sitemap-core/)
- [Full list](/docs/modules/)

## Status & reminders
- Experimental; APIs may shift. Package: `@apleasantview/eleventy-plugin-baseline` (npm).
- Set `site.url` via env for correct canonicals/sitemap; use `pathPrefix` if deploying under a subpath.
