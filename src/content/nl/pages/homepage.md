---
title: 'Eleventy Baseline'
slug: 'home'
description: 'Eleventy Baseline is een build framework voor Eleventy. Assets, head-tags, sitemaps en gestructureerde data, klaar bij de eerste build.'
date: 2026-05-17
seo:
  title: 'Eleventy Baseline: een build framework voor Eleventy'
permalink: '/nl/'
translationKey: homepage
layout: 'layouts/home.njk'
---

<div class="reveal-stagger u-flow">

<div class="c-breadcrumbs" style="--i: 1;"><a href="/release-notes/">v{{ _baseline.version }} uitgebracht</a></div>

<div class="u-flow" style="--i: 1;">

# Het build framework voor Eleventy-sites.

{{ settings.languages[lang].tagline }} {style="--flow-space-heading:0.5em"}

```bash
npm install @11ty/eleventy
npm install @apleasantview/eleventy-plugin-baseline
```

Installeer de packages, registreer Baseline in je Eleventy-config en start de dev-server. De [[quickstart | quickstart]] loopt de volledige setup door.

Liever bouwen dan lezen? De [[tutorial | tutorial]] begint met een lege map en eindigt met een homepage, een pagina, een bericht en een tweede taal, en legt elke beslissing uit op het moment dat hij genomen wordt.

Ben je nieuw met Eleventy, dan helpt het [[introduction | introductiehoofdstuk]] je op weg.

</div>

---

<div class="u-flow" style="--i: 2;">

Eleventy is een static site generator die de structurele beslissingen aan jou overlaat. De meeste Eleventy-projecten nemen uiteindelijk dezelfde beslissingen: een asset pipeline, afbeeldingen, head-tags, gestructureerde data, meertaligheid, sitemaps.

Baseline bundelt die beslissingen, al gemaakt en op elkaar afgestemd, in één plugin die de conventies van Eleventy zelf volgt. Een framework in wat het beslist, een plugin in hoe het installeert.

</div>

---

<div class="u-flow" style="--i: 3;">

## Gebouwd op standaarden en conventies

Baseline zit op Eleventy, niet eromheen. De data cascade, de templatetalen en de plugin-API blijven precies zoals gedocumenteerd, dus wat je al weet geldt nog steeds. Markdown en front matter zijn de bron van waarheid, Nunjucks waar een pagina logica nodig heeft. Eerst HTML, dan CSS, dan JavaScript waar de pagina het verdient.

Baseline schrijft geen componenten, CSS-methodologie of frontend framework voor, en levert geen client-side runtime.

Onder de motorkap: [Eleventy](https://www.11ty.dev/) · [[image-shortcode | eleventy-img]] · [[content-helpers | Markdown]] · [[globals | Nunjucks]] · [[assets-pipeline | PostCSS]] · [[assets | esbuild]]

</div>

---

<div class="u-flow" style="--i: 4;">

## Draait op Baseline

De site die je nu leest draait op Baseline. Open een willekeurige docs-pagina: de inhoudsopgave wordt gebouwd uit de gerenderde HTML, de "Linked from"-footer leest de content graph, en de gestructureerde data in de head is diezelfde graph, geprojecteerd voor zoekmachines.

Bekijk de broncode. Blader door de repo. Draai het lokaal.

[[about:nl | Lees het langere verhaal erachter]].

</div>

---

<div class="u-flow" style="--i: 5;">

## Doorlopende releases

Baseline verschijnt doorlopend. Elke release brengt het werk verder, gemarkeerd als `0.1.0-next.X`. Breaking changes komen met de regel die je moet aanpassen, uitgeschreven in de [release notes](/release-notes/). Pin een versie als je er iets serieus bovenop bouwt.

</div>

---

<div class="u-flow" style="--i: 6;">

## Open source

Baseline is MIT-gelicentieerd en gratis, ontwikkeld in de openbaarheid en onderhouden door [a pleasant view](https://www.apleasantview.com).

Voor hulp uit de community en vragen over Eleventy zelf kun je terecht op de [Eleventy Discord](https://www.11ty.dev/blog/discord/)-server.

[[commercial-support:nl | Commerciële ondersteuning]] krijg je rechtstreeks van de maintainer.

Voor bugs of fouten in de docs kun je [een issue openen](https://github.com/apleasantview/eleventy-plugin-baseline/issues). Als de docs een gedrag beweren dat je niet kunt reproduceren, dan kloppen de docs waarschijnlijk niet.

</div>

</div>
