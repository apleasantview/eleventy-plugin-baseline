---
title: 'Eleventy Baseline'
slug: 'homepage'
description: 'Eleventy Baseline is een plugin voor Eleventy die een kant-en-klare sitebasis biedt met assets, metadata en een levende content graph die de gerenderde output gesynchroniseerd houdt.'
date: 2026-05-17
permalink: '/nl/'
translationKey: homepage
layout: 'layouts/page.njk'
---

Elke werkende Eleventy-site bouwt dezelfde basis opnieuw op: assets compileren, head-tags, sitemap, beeldverwerking. Steeds hetzelfde grondwerk.

En elke site loopt tegen dezelfde grens aan. Je front matter is overal leesbaar. De gerenderde output niet. Dus schrijf je telkens weer dezelfde omwegen: een backlinks-index op basis van bestandsnamen, een inhoudsopgave die opnieuw uit de Markdown wordt geparset, gestructureerde data per pagina met de hand opgesteld. Allemaal parallel aan de gerenderde output, die uit de pas loopt zodra er iets hernoemd wordt.

Eleventy Baseline biedt beide, klaar op dag één. Al gebouwd, met een levende weerspiegeling van alles wat je rendert. Je project blijft van jou.

---

## In de praktijk

Baseline is een werkende basis voor Eleventy-sites.

Beelden worden in de juiste breedtes en moderne formaten gerenderd, standaard lazy. Links tussen pagina's leven op naam, dus mappen verplaatsen breekt ze niet. De head-tags worden gevuld vanuit één settings-bestand, met overrides op paginaniveau waar nodig.

Je layouts, stijlen, scripts en redactionele structuur blijven van jou. Houd de defaults waar ze helpen en override waar je het nodig hebt.

---

## Gebouwd op Baseline

De site die je nu leest draait op Baseline. Wat je voor je hebt is het systeem zelf in gebruik, geen illustratie ervan.

Open een willekeurige docs-pagina en probeer het: de inhoudsopgave wordt gebouwd uit de gerenderde HTML, de "Linked from"-footer leest de content graph, de taalwisselaar leest de settings. Allemaal aangesloten op hetzelfde systeem waar je over leest.

Bekijk de broncode. Blader door de repo. Draai het lokaal. Het is zichtbaar.

---

## De drielagige architectuur

Verantwoordelijkheden blijven gescheiden, en elke laag heeft één taak. Veranderingen blijven voorspelbaar terwijl de site groeit.

### State

Je settings en opties, eenmalig genormaliseerd bij het opstarten. Elke module leest dezelfde vorm.

### Runtime

Wat de build over zichzelf weet: de templates, de vertalingen, de content graph. Modules lezen hieruit in plaats van uit elkaar.

### Modules

De functies die uit beide lezen: `assets`, `head`, `multilang`, `navigator`, `sitemap`. Geen van hen roept de ander aan; ze lezen wat ze nodig hebben uit runtime.

Volledige uitleg in de [[docs | docs]].

---

## Installeren en starten

Installeer de packages, registreer Baseline in je Eleventy-config en draai de dev-server.

```bash
npm install @11ty/eleventy @11ty/eleventy-img
npm install @apleasantview/eleventy-plugin-baseline
npm run dev
```

De [[quickstart | quickstart]] loopt de volledige setup door. De [[docs | docs]] behandelen de modules en de architectuur. De [[simple-baseline-site | tutorial voor een eenvoudige site]] bouwt een kleine site vanaf nul.

### Doorlopende releases

Baseline verschijnt continu. Elke release brengt het werk verder, gemarkeerd als `0.1.0-next.X`. De volgende stabiele release landt samen met Eleventy v4. Pin een versie als je er iets serieus bovenop bouwt.

Als de docs een gedrag beweren dat je niet kunt reproduceren, dan kloppen de docs waarschijnlijk niet. [Open dan een issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues).

Commerciële ondersteuning beschikbaar via [a pleasant view](https://www.apleasantview.com).
