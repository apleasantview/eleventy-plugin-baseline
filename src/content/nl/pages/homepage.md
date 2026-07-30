---
title: 'Eleventy Baseline'
slug: 'home'
description: 'Eleventy Baseline is een build framework voor Eleventy. Assets, head-tags, sitemaps en gestructureerde data, klaar bij de eerste build.'
date: 2026-05-17
permalink: '/nl/'
translationKey: homepage
layout: 'layouts/home.njk'
---

<small><a href="/release-notes">v{{ _baseline.version }} uitgerold</a></small>

# Het build framework voor Eleventy-sites.

{{ settings.languages[lang].tagline }} {style="--flow-space-heading:0.5em"}

Eleventy is een static site generator die de structurele beslissingen aan jou overlaat. De meeste Eleventy-projecten nemen uiteindelijk dezelfde beslissingen: asset pipeline, afbeeldingen, SEO, gestructureerde data, meertaligheid, sitemaps en deployment-lijm.

Baseline neemt die beslissingen voor je, geïmplementeerd en samengebracht in één plugin, volgens de conventies van Eleventy zelf.

---

## Installeren en starten

```bash
npm install @11ty/eleventy @11ty/eleventy-img
npm install @apleasantview/eleventy-plugin-baseline
```

Installeer de packages, registreer Baseline in je Eleventy-config en start de dev-server.

De [[quickstart | quickstart]] loopt de volledige setup door. Ben je nieuw met Eleventy, dan helpt het [[introduction | introductiehoofdstuk]] je op weg.

---

## Wat je krijgt

### Assets

De asset pipeline, aangesloten. Eén entry point per map (`index.css`, `index.js`), CSS via PostCSS en JS via esbuild. Afbeeldingen renderen in de juiste breedtes en moderne formaten, standaard lazy.

### SEO

De head-tags worden gevuld vanuit één settings-bestand, met overrides op paginaniveau waar nodig. Daarnaast zendt `<baseline-head>` een JSON-LD-graph met gestructureerde data uit, plus Open Graph, Twitter Cards en een canonical link, zonder bedrading per pagina.

De opbouw van de gestructureerde data volgt het model van `seo-graph-core`, van Joost de Valk van Yoast.

### Meertaligheid

Meertaligheid op basis van mappen: collecties per taal, vertalingsmapping, hreflang en i18n-filters. Meertalige sites krijgen een sitemap per taal plus een index.

---

## Gebouwd op standaarden en conventies

Eleventy eronder. Content als bron van waarheid. Niets naar de browser gestuurd dat de pagina niet nodig heeft. Baseline schrijft geen componenten, CSS-methodologie of frontend framework voor.

### Bouw sites met Eleventy

Baseline zit op Eleventy, niet eromheen. De data cascade, de templatetalen en de plugin-API blijven precies zoals gedocumenteerd, dus wat je al weet geldt nog steeds. Afbeeldingen lopen via Eleventy's eigen image plugin: AVIF en WebP, responsieve afbeeldingsformaten, standaard lazy.

[Eleventy](https://www.11ty.dev/) · [[image-shortcode | eleventy-img]]

### Schrijf content-first websites

Markdown en front matter zijn de bron van waarheid, Nunjucks waar een pagina logica nodig heeft. De build houdt een graph bij van wat je daadwerkelijk gerenderd hebt, zodat pagina's op naam naar elkaar linken en je structuur uit je content voortkomt in plaats van ernaast onderhouden te worden.

[[content-helpers | Markdown]] · [[globals | Nunjucks]] · [[content-graph | content graph]]

### Ontwikkel met progressive enhancement

Schrijf eerst je HTML-templates, dan CSS, dan JavaScript waar de pagina het verdient. Je eigen `postcss.config.js` wordt gebruikt zoals je hem schrijft en esbuild verzorgt de bundle. Baseline levert momenteel geen client-side runtime en niets om te hydrateren.

[[head | HTML]] · [[assets-pipeline | PostCSS]] · [[assets | esbuild]]

---

## Eén content graph eronder

Backlinks, wikilinks die een mapverplaatsing overleven, breadcrumbs en gestructureerde data komen allemaal uit dezelfde onderliggende content graph.

Eleventy kan je front matter overal lezen. De pagina die het net gebouwd heeft, kan het niet lezen. Baseline leest de afgewerkte HTML en geeft het resultaat als graph door aan elke template.

---

## Draait op Baseline

De site die je nu leest draait op Baseline. Wat je voor je hebt is het systeem zelf in gebruik, geen demonstratiesite.

Open een willekeurige docs-pagina: de inhoudsopgave wordt gebouwd uit de gerenderde HTML, de "Linked from"-footer leest de content graph, en de gestructureerde data in de head is diezelfde graph, geprojecteerd voor zoekmachines.

Bekijk de broncode. Blader door de repo. Draai het lokaal. Het is zichtbaar.

---

## Open source

Baseline is MIT-gelicentieerd en gratis, ontwikkeld in de openbaarheid door [a pleasant view](https://www.apleasantview.com).

[[commercial-support:nl | Commerciële ondersteuning]] is beschikbaar voor adoptie, migratie, eigen modules, werk aan gestructureerde data of volledige sitebuilds.

## Doorlopende releases

Baseline verschijnt doorlopend. Elke release brengt het werk verder, gemarkeerd als `0.1.0-next.X`. Breaking changes komen met de regel die je moet aanpassen, uitgeschreven in de [release notes](/release-notes/). Pin een versie als je er iets serieus bovenop bouwt.

Als de docs een gedrag beweren dat je niet kunt reproduceren, dan kloppen de docs waarschijnlijk niet. [Open dan een issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues).
