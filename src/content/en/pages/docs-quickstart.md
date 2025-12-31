---
title: "Quickstart"
permalink: "/docs/quickstart/"
layout: "layouts/page.njk"
topicSlug: "introduction"
topicTitle: " "
description: "Fast path to a single-language Baseline site—install, configure, run dev/build."
---

Fast path to a single-language Baseline site. For full context, see the Simple Baseline Site tutorial.

## Prerequisites
- Node 20.15.0+ and npm.
- `package.json` with `"type": "module"` and scripts:
  ```json
  {
    "type": "module",
    "scripts": {
      "dev": "npx @11ty/eleventy --serve",
      "build": "npx @11ty/eleventy"
    }
  }
  ```

## 1) Install
```bash
mkdir baseline-quickstart
cd baseline-quickstart
npm init -y
npm install @11ty/eleventy @apleasantview/eleventy-plugin-baseline @11ty/eleventy-img
```

## 2) Configure
- `.env`:
  ```
  ELEVENTY_ENV="development"
  URL="http://localhost:8080/"
  ```
- `eleventy.config.js`: add `baseline({})` and export `config`; if you have other config/plugins, place Baseline last.
- `src/_data/site.js`: title/tagline/url/defaultLanguage.
- `src/_data/head.js`: CSS/JS links.
- `src/_includes/layouts/base.njk`: add `<baseline-head>` inside `<head>`.
- `src/content/pages/index.md`: front matter + minimal body.
- Assets: `src/assets/assets.11tydata.js` (exclude from collections), `src/assets/css/index.css`, `src/assets/js/index.js`.

## 3) Run and build
- Dev: `npx rimraf dist && npm run dev`
  - Open http://localhost:8080/; check `dist/` (including `dist/sitemap.xml`).
- Build: `npx rimraf dist && npm run build`
  - Inspect `dist/` for final output.

## Next steps
- Tutorial: [Build a Simple Baseline Site](/docs/tutorials/build-a-simple-baseline-site/)
- Assets: [Assets Pipeline Quickstart](/docs/tutorials/assets-pipeline-quickstart/)
- Head/SEO: [Head & SEO Basics](/docs/tutorials/head-seo-basics/)
- Multilingual: [Build a Multilingual Baseline Site](/docs/tutorials/build-a-multilingual-baseline-site/)

