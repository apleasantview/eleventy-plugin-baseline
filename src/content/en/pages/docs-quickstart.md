---
title: "Quickstart"
permalink: "/docs/quickstart/"
layout: "layouts/page.njk"
topicSlug: "introduction"
topicTitle: " " 
---

A fast path to a single-language Baseline site. For code and details, use the linked tutorial.

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

## Install
```bash
mkdir baseline-quickstart
cd baseline-quickstart
npm init -y
npm install @11ty/eleventy @apleasantview/eleventy-plugin-baseline @11ty/eleventy-img
```

Create a `.env` file:
```
ELEVENTY_ENV="development"
URL="http://localhost:8080/"
```

## Checklist
- Config: `eleventy.config.js` with `baseline({})` and config object.
- Data: `src/_data/site.js` (title/tagline/url/lang) and `src/_data/head.js` (CSS/JS links).
- Layout: `src/_includes/layouts/base.njk` with `<baseline-head>` in `<head>`.
- Page: `src/content/pages/index.md` with front matter + minimal body.
- Assets: `src/assets/assets.11tydata.js` (exclude from collections), `src/assets/css/index.css`, `src/assets/js/index.js`.

Follow the tutorial: [Build a Simple Baseline Site](/docs/tutorials/build-a-simple-baseline-site/).

## Run and build
```bash
npx rimraf dist && npm run dev
```
Open http://localhost:8080/, peek at `dist/` (including `dist/sitemap.xml`).

```bash
npx rimraf dist && npm run build
```
Check `dist/` for final output.

## Next steps
- Tutorial: [Build a Simple Baseline Site](/docs/tutorials/build-a-simple-baseline-site/)
- Assets: [Assets Pipeline Quickstart](/docs/tutorials/assets-pipeline-quickstart/)
- Head/SEO: [Head & SEO Basics](/docs/tutorials/head-seo-basics/)
- Multilingual: [Build a Multilingual Baseline Site](/docs/tutorials/build-a-multilingual-baseline-site/)

