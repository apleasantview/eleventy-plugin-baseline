---
title: 'Eleventy Baseline'
slug: 'home'
description: 'Eleventy Baseline is een build framework voor Eleventy. Assets, head-tags, sitemaps en gestructureerde data, klaar bij de eerste build.'
date: 2026-05-17
permalink: '/nl/'
translationKey: homepage
layout: 'layouts/home.njk'
---

<small><a href="/release-notes/">v{{ _baseline.version }} uitgebracht</a></small>

# Het build framework voor Eleventy-sites.

{{ settings.languages[lang].tagline }} {style="--flow-space-heading:0.5em"}

Eleventy is een static site generator die de structurele beslissingen aan jou overlaat. De meeste Eleventy-projecten nemen uiteindelijk dezelfde beslissingen: een asset pipeline, afbeeldingen, head-tags, gestructureerde data, meertaligheid, sitemaps.

Baseline bundelt die beslissingen, al gemaakt en op elkaar afgestemd, in één plugin die de conventies van Eleventy zelf volgt. Een framework in wat het beslist, een plugin in hoe het installeert.

---

## Installeren en starten

```bash
npm install @11ty/eleventy @11ty/eleventy-img
npm install @apleasantview/eleventy-plugin-baseline
```

Installeer de packages, registreer Baseline in je Eleventy-config en start de dev-server. De [[quickstart | quickstart]] loopt de volledige setup door.

Ben je nieuw met Eleventy, dan helpt het [[introduction | introductiehoofdstuk]] je op weg.

---

## Wat je krijgt

### Assets

De asset pipeline, aangesloten. Eén entry point per assetmap: `index.css` loopt via PostCSS, `index.js` via esbuild. Afbeeldingen renderen in de juiste breedtes en moderne formaten, standaard lazy.

### SEO

De head-tags worden gevuld vanuit één settings-bestand, met overrides op paginaniveau waar nodig. `<baseline-head>` zendt een canonical link uit, Open Graph, Twitter Cards en een JSON-LD-graph met gestructureerde data, zonder bedrading per pagina.

De opbouw van de gestructureerde data volgt het model van `seo-graph-core`, van Joost de Valk van Yoast.

### Meertaligheid

Meertaligheid op basis van mappen: collecties per taal, vertalingsmapping, hreflang en i18n-filters. Sitemaps komen per taal, met een index erbovenop.

---

## Eén content graph eronder

Backlinks, wikilinks die een mapverplaatsing overleven, breadcrumbs en de gestructureerde data in de head zijn allemaal projecties van één content graph.

Zonder die graph onderhoud je elk daarvan met de hand: een backlinks-index op basis van bestandsnamen, een inhoudsopgave die opnieuw uit de Markdown wordt geparset, gestructureerde data pagina per pagina geschreven. Allemaal loopt het uit de pas zodra je een bestand hernoemt.

Baseline bouwt die graph uit de HTML nadat die gerenderd is, dus hij is altijd wat je echt hebt uitgeleverd.

---

## Gebouwd op standaarden en conventies

Baseline zit op Eleventy, niet eromheen. De data cascade, de templatetalen en de plugin-API blijven precies zoals gedocumenteerd, dus wat je al weet geldt nog steeds. Markdown en front matter zijn de bron van waarheid, Nunjucks waar een pagina logica nodig heeft. Eerst HTML, dan CSS, dan JavaScript waar de pagina het verdient.

Baseline schrijft geen componenten, CSS-methodologie of frontend framework voor, en levert geen client-side runtime.

Onder de motorkap: [Eleventy](https://www.11ty.dev/) · [[image-shortcode | eleventy-img]] · [[content-helpers | Markdown]] · [[globals | Nunjucks]] · [[assets-pipeline | PostCSS]] · [[assets | esbuild]]

---

## Draait op Baseline

De site die je nu leest draait op Baseline. Open een willekeurige docs-pagina: de inhoudsopgave wordt gebouwd uit de gerenderde HTML, de "Linked from"-footer leest de content graph, en de gestructureerde data in de head is diezelfde graph, geprojecteerd voor zoekmachines.

Bekijk de broncode. Blader door de repo. Draai het lokaal.

[[about:nl | Lees het langere verhaal erachter]].

---

## Open source

Baseline is MIT-gelicentieerd en gratis, ontwikkeld in de openbaarheid en onderhouden door [a pleasant view](https://www.apleasantview.com).

[[commercial-support:nl | Commerciële ondersteuning]] krijg je rechtstreeks van de maintainer.

## Doorlopende releases

Baseline verschijnt doorlopend. Elke release brengt het werk verder, gemarkeerd als `0.1.0-next.X`. Breaking changes komen met de regel die je moet aanpassen, uitgeschreven in de [release notes](/release-notes/). Pin een versie als je er iets serieus bovenop bouwt.

Als de docs een gedrag beweren dat je niet kunt reproduceren, dan kloppen de docs waarschijnlijk niet. [Open dan een issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues).
