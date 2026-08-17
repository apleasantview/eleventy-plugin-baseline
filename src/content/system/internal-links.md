---
title: 'Internal links index'
slug: 'internal-links'
description: 'Browse incoming links and references across the content graph.'
date: 2026-05-10
---

Incoming links across the content graph.

Each page lists where it is referenced and provides a short excerpt of the surrounding context when available.

---

{% if _navigator.edges | length %}

<div class="backlinks u-flow">

{% set edges = _navigator.edges | selectattr("internal") | list %}

{% if edges | length %}

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

```nunjucks
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

</div>

{% endif %}
