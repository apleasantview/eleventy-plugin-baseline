---
title: 'Over Eleventy Baseline'
slug: 'about'
description: 'Hoe een persoonlijke starter voor klantenwerk uitgroeide tot een build framework voor Eleventy.'
date: 2026-05-23
permalink: '/nl/about/'
translationKey: 'about'
type: 'about'
pageType: 'AboutPage'
---

_Baseline is een build framework voor Eleventy: de structurele beslissingen die je anders in elk project opnieuw zou aansluiten, al genomen. Op zoek naar de pitch? Die staat op de [homepage](/nl/)._

_Deze pagina is het langere, eerlijkere verhaal._

---

## Van starter naar plugin

Baseline begon als mijn honderdste poging om een starter voor klantenwerk te maken, deze keer met de bedoeling het echt goed te doen. De eerste versie lag een tijd stil, maar ik bleef erop terugkomen. Met één oog op de patronen en tooling die in de Eleventy-community al (stilzwijgend) waren ontstaan.

Het andere oog lag op wat er voor mij ontbrak: klantensites in sync houden zonder bestanden tussen projecten te kopiëren en te herschrijven, de sitemaps per taal die ik miste uit Hugo, de ene settings-vorm die WordPress goed heeft.

De vorm viel op zijn plek terwijl ik nadacht over iets wat Zach Leatherman, de maker van Eleventy, ooit zei: dat in Eleventy eigenlijk alles een plugin is. Ik parafraseer, maar dat was het moment waarop het in mijn hoofd geen starter meer was.

De herschrijving landde op 1 december 2025 als één commit, "Rewrite baseline as a plugin." Kort daarna kondigde ik het project aan op de Eleventy Discord, voor het geval het ook voor anderen nuttig zou zijn.

Die verschuiving veranderde wat het project moest zijn. Een persoonlijke starter mag impliciet blijven. Je weet waarom dingen zijn zoals ze zijn, want jij hebt ze er zo neergezet. Een plugin kan daar niet op teren. Anderen moeten de keuzes begrijpen, of ze op zijn minst genoeg vertrouwen om te beginnen.

Het systeem is gegroeid door gebruik. Modules toegevoegd wanneer het project ze nodig had, elk met eigen beslissingen, elk leunend op de andere. De starter werd een systeem. Geleidelijk, en toen ineens.

De framing schoof mee. De oudere omschrijving noemde Baseline een "dunne, optionele bedradingslaag." Dat klopte ooit. Tegen april 2026 was het een uitgesproken vertrekpunt geworden. De waarde zit hem niet in dun zijn. De waarde is dat deze beslissingen genomen zijn, dat ze samenwerken, en dat het pad om er één te veranderen duidelijk is wanneer je het er niet mee eens bent.

Wat er nu in Baseline zit is grotendeels wat ik geleerd heb over bouwen met Eleventy, en daaronder vijftien jaar werken in tech, vooral maar niet alleen op het web. De beslissingen, de omwegen, de kleine gemakken die over honderden pagina's optellen.

Het is onderweg zijn eigen ding geworden, maar het kwam voort uit een jeuk die elke Eleventy-ontwikkelaar herkent: dezelfde dingen aansluiten op je derde nieuwe project en je afvragen of er geen betere manier is om dat werk te bewaren.

De kennis in code gieten is de makkelijke helft. De juiste vorm ervoor vinden, wat te benoemen, wat te groeperen, wat in de plugin thuishoort en wat in de documentatie, is de moeilijke, en die is nog volop in beweging.

Vandaag is Baseline een werkende plugin die de structurele beslissingen voor een Eleventy-project afhandelt: dingen als responsieve afbeeldingsbreedtes, de head-tags die elke site nodig heeft, sitemaps per taal met `x-default`, concepten die uit productie blijven.

Het verschijnt doorlopend op npm als `0.1.0-next.X` en draait in productie op zijn eigen documentatiesite, op [a pleasant view](https://www.apleasantview.com), en op klantensites. De code is stabiel. De architectuur ligt vast. De woorden eromheen lopen nog achter.

---

## Eleventy en de educatieve kloof

Rond de tijd dat het plugin-idee vorm kreeg, probeerde ik actiever te zijn op de Eleventy Discord, meehelpen in het supportkanaal. Oude tech-supportreflexen kwamen terug, en oude frustraties ook. Communityleden draaien threads van zestig berichten om iemand erdoorheen te helpen. Dat is prijzenswaardig. Het is ook uitputtend. Mijn recente overlevingsstrategie is documentatielinks droppen.

Maar de 11ty-documentatie is lastig te doorzoeken als je niet weet waar je naar zoekt. Deels omdat Eleventy zo weinig uitgesproken is over sitestructuur dat er geen vanzelfsprekend pad doorheen loopt. En deels omdat de documentatie een monoliet is die je niet met een opportunistische pull request repareert. Daar zou een actieve maintainersdiscussie voor nodig zijn om te herstructureren.

Eleventy laat zijn structurele beslissingen bewust open. Dat is zijn kracht voor ervaren ontwikkelaars en zijn muur voor iedereen anders. Baseline kan het ding zijn dat die kloof vult: hier is één goede manier, hier is waarom, en hier verander je het wanneer je eraan toe bent.

De vergelijking is niet met andere Eleventy-plugins. Het is Nuxt, Astro, Hugo. Tools die de afstand verkleinen tussen "geïnstalleerd" en "aan het bouwen."

---

## Waar het heen gaat

De architectuur blijft zichzelf hervormen naast de functionaliteit: fundamentele stukken worden gepromoveerd tot volwaardige lagen, modulegrenzen worden scherper, dingen krijgen andere namen. Elk stuk begint klein en bedoeld, en evolueert mee met wat het project echt nodig heeft.

Nog iets knaagt al een tijdje: Eleventy wordt bijna nooit in één adem genoemd met Astro en Hugo, en Astro kwam later en haalde het bijna meteen in. De plugin lost dat niet op. Maar het vermoeden dat dit werk aandrijft, is dat de kloof niet over capaciteit gaat. Het gaat over diezelfde afstand, die tussen "ik heb het geïnstalleerd" en "ik heb een site draaien." Astro dicht die uit de doos. Baseline probeert dat voor Eleventy te doen.

De SEO-laag landde in juni: `<baseline-head>` zendt nu de graph met gestructureerde data, de social tags en de canonical uit, zonder bedrading per site. Volgende op de horizon: een module voor mediabeheer.

---

Als dit alles nuttig klinkt: de documentatie staat op [eleventy-baseline.dev](https://www.eleventy-baseline.dev/). De plugin staat op npm als `@apleasantview/eleventy-plugin-baseline`. Releases rollen doorlopend als `0.1.0-next.X`. Pin een versie als je er iets serieus bovenop bouwt.
