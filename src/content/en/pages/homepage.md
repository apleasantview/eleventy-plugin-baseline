---
title: 'Eleventy Baseline'
slug: 'homepage'
description: 'Eleventy Baseline is a plugin for Eleventy that provides a ready-made site foundation with assets, metadata, and a live content graph that keeps rendered output in sync.'
date: 2026-05-17
permalink: '/'
translationKey: homepage
layout: 'layouts/page.njk'
---

Every working Eleventy site rebuilds the same foundation: asset compilation, head tags, sitemap, image handling. The same groundwork every time.

And every site hits the same limit. Your front matter is readable from anywhere. The rendered output is not. So you end up writing the same workarounds: a backlinks index built from filenames, a table of contents re-parsed from Markdown, structured data hand-rolled per page. All of it running parallel to the rendered output, drifting out of sync the moment anything is renamed.

Eleventy Baseline provides both, ready on day one. Already built, with a live reflection of everything you render. Your project still belongs to you.

---

## In practice

Baseline is a working foundation for Eleventy sites.

Images render at the right widths in modern formats, lazy by default. Links between pages live by name, so folder moves do not break them. The head tags fill from one settings file, with page-level overrides where needed.

Your layouts, styles, scripts, and editorial structure stay yours. Keep the defaults where they help, and override where you need to.

---

## Built on Baseline

The site you are reading runs on Baseline. What you are looking at is the system itself in use, not an illustration of it.

Open any docs page and try it: the table of contents is built from the rendered HTML, the "Linked from" footer reads the content graph, the language switcher reads the settings. All wired by the same system you are reading about.

View source. Browse the repo. Run it locally. It's visible.

---

## The three-layer architecture

Responsibilities stay separated, and each layer has one job. Changes stay predictable as the site grows.

### State

Your settings and options, normalised once at startup. Every module reads the same shape.

### Runtime

What the build knows about itself: the templates, the translations, the content graph. Modules read from here instead of from each other.

### Modules

The features that read from both: assets, head, multilang, navigator, sitemap. None of them call each other; they read what they need from runtime.

Full breakdown in the [[docs | docs]].

---

## Install and start

Install the packages, register Baseline in your Eleventy config, and run the dev server.

```bash
npm install @11ty/eleventy @11ty/eleventy-img
npm install @apleasantview/eleventy-plugin-baseline
npm run dev
```

The [[quickstart | quickstart]] walks through the full setup. The [[docs | docs]] cover the modules and the architecture. The [[simple-baseline-site | simple-site tutorial]] builds a small site from zero.

### Rolling releases

Baseline ships continuously. Each release advances the work, marked `0.1.0-next.X`. The next stable release will land alongside Eleventy v4. Pin a version when you build something serious on top.

If something in the docs claims a behaviour you cannot reproduce, the docs are probably wrong. Please [open an issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues).

Commercial support available from [a pleasant view](https://www.apleasantview.com).
