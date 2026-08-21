---
title: 'Release notes'
slug: 'release-notes'
description: 'Baseline ships on a rolling release cadence (0.1.0-next.X). Every entry names what changed and the line you have to change with it.'
date: '2026-06-04'
permalink: '/release-notes/'
---

{% deckBlock %}

Baseline ships on a rolling release cadence (`0.1.0-next.X`). Things shift, break, and get renamed between releases. Pin a version when you build something serious on top.

Install from npm:  
`npm install @apleasantview/eleventy-plugin-baseline --save-exact`

{% enddeckBlock %}

{%- set latest = collections.releases | last %}

## Latest release

### [{{ latest.data.title }}]({{ latest.url }})

{{ latest.data.description }}

[Read the full notes]({{ latest.url }})

---

## Previous releases

{% for release in collections.releases | reverse %}
{%- if not loop.first %}

### [{{ release.data.title }}]({{ release.url }})

{{ release.data.description }}
{% endif -%}
{% endfor %}
