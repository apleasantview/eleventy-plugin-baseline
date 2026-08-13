---
title: 'Sitemap'
slug: 'sitemap-index'
description: 'Every English page on the site, grouped by section.'
date: 2026-08-13
permalink: '/sitemap/'
---

Every English page on the site, grouped by section.

This is the readable one. The machine-readable sitemaps live at `/sitemap.xml`.

---

{# English pages only, minus this page and Baseline's virtual templates, which
   are the ones that keep a file extension in their URL. #}
{% set pages = [] %}
{% for url, node in _navigator.nodes %}
{% if node.lang == 'en' and node.url != page.url and '.html' not in node.url %}
{% set pages = (pages.push(node), pages) %}
{% endif %}
{% endfor %}

{# section is an array, so join it deliberately. Letting groupby key off the
   array itself stringifies it and yields headings like "Docs,concept". #}
{% set sections = [] %}
{% for node in pages %}
{% set key = (node.section or ['Pages']) | join(' / ') %}
{% if key not in sections %}
{% set sections = (sections.push(key), sections) %}
{% endif %}
{% endfor %}

{# Top-level pages lead, then everything else alphabetically. #}
{% set ordered = [] %}
{% if 'Pages' in sections %}
{% set ordered = (ordered.push('Pages'), ordered) %}
{% endif %}
{% for section in sections %}
{% if section != 'Pages' %}
{% set ordered = (ordered.push(section), ordered) %}
{% endif %}
{% endfor %}

{% if pages | length %}

<div class="sitemap u-flow">

{{ pages | length }} pages.

{% for section in ordered %}

## {{ section | replace('-', ' ') | title }}

<ul class="u-flow">
{% for node in pages %}
{% if (node.section or ['Pages']) | join(' / ') == section %}
<li>
<a href="{{ node.url }}">{{ node.title | default(node.url, true) }}</a>
{% if node.excerpt %}<br><small>{{ node.excerpt | truncate(140, true, '...') }}</small>{% endif %}
</li>
{% endif %}
{% endfor %}
</ul>

{% endfor %}

</div>

{% else %}

No pages in the graph yet. This page fills in once the site has been built.

{% endif %}
