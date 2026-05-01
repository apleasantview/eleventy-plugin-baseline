---
title: 'Eleventy Baseline'
slug: 'home'
description: 'Start building your site and skip the recurring setup work.'
date: 2026-05-01
permalink: '/'
translationKey: homepage
layout: 'layouts/page.njk'
---

Baseline is an Eleventy plugin for the project plumbing most sites need from day one.
You get a working starting point without giving up control of your project.

## Start building your site.

You can move straight to templates and content instead of assembling the same groundwork first.
You spend less time on setup and more time on the site itself.

### Skip the parts you usually wire by hand.

Baseline covers assets, head output, sitemap, multilingual routing, and debug tools.
Most Eleventy projects rebuild these pieces sooner or later.

---

## You keep control of templates and content.

Baseline handles infrastructure while your layouts, styles, scripts, and editorial structure remain yours.
Keep the defaults where they help, and override where you need to.

## Run it and check the output.

Start the dev server, inspect the output, and adjust only what you want to override.
Start from the [quickstart](/docs/introduction/quickstart/), browse the [docs](/docs/), or follow the [simple-site tutorial](/docs/tutorial/simple-baseline-site/).

---

## Introducing the three-layer architecture

The architecture keeps responsibilities separated so the system stays clear as your site grows.
Each layer has one job, which keeps changes predictable.

### State.

State normalises your settings and options once, then passes them downstream as stable input.
That gives every module the same consistent view of your project configuration.

### Runtime.

Runtime exposes build-time data through a shared access layer instead of cross-module coupling.
Modules read shared context there instead of wiring directly to each other.

### Modules.

Modules register focused features and read shared runtime data without depending on each other directly.
Today that includes assets, head, sitemap, multilang, and navigator.

---

## Install and start

Install the packages, add Baseline to your Eleventy config, and run the dev server.
See the [quickstart](/docs/introduction/quickstart/) for the full setup path:

```bash
npm install @11ty/eleventy @11ty/eleventy-img
npm install @apleasantview/eleventy-plugin-baseline
npm run dev
```

### Stability and scope

Baseline is in active development. Versions ship as `0.1.0-next.X` and that is a deliberate signal: things may shift between releases, and you should pin a version when you build something serious on top. The five modules above are the supported surface today. Open Graph and Twitter cards are staged in the code but not wired through to output yet; if you need them now, render them yourself via `settings.head.meta[]`.

If something in the docs claims a behaviour you cannot reproduce, the docs are probably wrong. Please [open an issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues).
