---
title: 'Backlinks index'
slug: 'backlinks-index'
description: 'Browse incoming links and references across the content graph.'
date: 2026-05-10
permalink: '/backlinks/'
layout: 'layouts/page.njk'
baselineExcludeFromGraph: true
noindex: true
---

Incoming links across the content graph.

Each page lists where it is referenced and provides a short excerpt of the surrounding context when available.

---

{% if _navigator.edges | length %}

<div class="backlinks u-flow">

{% for type, edges in _navigator.edges | groupby("type") %}

{% if type === "link" %}

## Backlinks

There are {{ edges | unique('to') | length }} pages referencing {{ edges | length }} URLs.

{% for to, edge in edges | sort(false, false, "to") | groupby("to") %}

<div class="u-flow" style="margin-top: 2rem;">

<p><strong>{{ loop.index }}. {{ to.split('?')[0] | truncate(90, true, '...') }}</strong>  
<br><small>({{ edge.length }} references)</small></p>

<div class="l-fluid-grid--autofill" style="margin-top: 0.5rem; column-gap: 2.5rem;">

{% for link in edge %}

<details>

<summary><small>View reference</small></summary>

<small style="margin-top: 0.25rem;">
From: <a href="{{ link.from }}">{{ link.from }}</a>
<br>Text: {{ link.text}}

```json
{{ link | _json(2) | safe }}

```

</small>

</details>

{% endfor %}

</div>

</div>

{% endfor %}

<br>

{% endif %}

{% endfor %}

</div>

{% endif %}
