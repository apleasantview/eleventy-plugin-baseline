---
title: 'FAQ'
slug: 'faq'
description: 'Common questions about Eleventy Baseline: lock-in, scope, production-readiness, tooling, SEO, and support.'
date: '2026-06-02'
permalink: '/faq/'
layout: 'layouts/page.njk'
lang: 'en'
pageType: 'FAQPage'
---

{%- for item in collections.faq %}

## {{ item.data.title }}

{{ item.content | safe }}

{%- endfor %}

{# render-time hook: enriches this page's FAQPage node with mainEntity (side-effect, prints nothing) #}
{{ _hook('faq') }}
