---
title: 'Agent discovery'
slug: 'agent-discovery'
description: 'Static discovery surfaces for AI agents and integrations.'
date: 2026-05-22
permalink: '/agent-discovery/'
---

This site exposes a handful of static surfaces that AI agents, search crawlers, and integrations can read without parsing HTML. They are generated at build time and cross-reference each other.

- `/sitemap.xml`: every indexable URL on the site
- `/schemamap.xml`: index of structured-data corpora
- `/schema/<type>.json`: JSON-LD corpus per content type (article, page, about)
- `/llms.txt`: narrative listing for LLM consumers
- `/.well-known/api-catalog`: discovery manifest (RFC 9727)
- Per-page `.md` siblings: clean markdown source for each HTML page

The conventions behind these surfaces (editorial `type`, schema overrides via `pageType` and `articleType`, system-page opt-out) live in the Baseline plugin documentation.

Source: https://github.com/apleasantview/eleventy-plugin-baseline
