---
title: 'À propos d''Eleventy Baseline'
slug: 'about'
description: "Comment un starter personnel pour du travail client est devenu un build framework pour Eleventy."
date: 2026-05-23
permalink: '/fr/about/'
translationKey: 'about'
type: 'about'
pageType: 'AboutPage'
---

_Baseline est un build framework pour Eleventy : les décisions structurelles que vous câbleriez autrement sur chaque projet, déjà prises. Vous cherchez le pitch ? Il est sur la [page d'accueil](/fr/)._

_Cette page, c'est l'histoire plus longue et plus honnête._

---

## Du starter au plugin

Baseline a commencé comme ma centième tentative de starter pour du travail client, cette fois en essayant d'être vraiment sérieux. La première version est restée dormante un moment, mais j'y revenais sans cesse. Avec un œil sur les patterns et les outils déjà (silencieusement) établis dans la communauté Eleventy.

L'autre œil était sur ce qui me manquait : garder les sites clients synchronisés sans copier et réécrire des fichiers d'un projet à l'autre, les sitemaps par langue que je regrettais de Hugo, la forme unique de réglages que WordPress réussit bien.

La forme s'est mise en place pendant que je réfléchissais à une remarque de Zach Leatherman, le créateur d'Eleventy : que dans Eleventy, tout est essentiellement un plugin. Je paraphrase, mais c'est le moment où, dans ma tête, ce n'était plus un starter.

La réécriture est arrivée le 1er décembre 2025 en un seul commit, « Rewrite baseline as a plugin ». J'ai annoncé le projet sur le Discord d'Eleventy peu après, au cas où il serait utile à d'autres.

Ce basculement a changé ce que le projet devait être. Un starter personnel peut rester implicite. Vous savez pourquoi les choses sont comme elles sont, puisque c'est vous qui les avez mises là. Un plugin ne peut pas se reposer là-dessus. D'autres gens doivent comprendre les choix, ou du moins leur faire assez confiance pour démarrer.

Le système a grandi par l'usage. Des modules ajoutés quand le projet en avait besoin, chacun avec ses propres décisions, chacun s'appuyant sur les autres. Le starter est devenu un système. Progressivement, puis d'un coup.

Le cadrage a suivi. L'ancienne description parlait de Baseline comme d'une « couche de câblage fine et optionnelle ». C'était vrai à une époque. En avril 2026, c'était devenu un point de départ assumé. La valeur n'est pas dans la finesse. La valeur, c'est que ces décisions sont prises, qu'elles fonctionnent ensemble, et que le chemin pour en changer une est clair quand vous n'êtes pas d'accord.

Ce qu'il y a dans Baseline aujourd'hui, c'est l'essentiel de ce que j'ai appris en construisant avec Eleventy, et en dessous, quinze ans de travail dans la tech, principalement mais pas uniquement sur le web. Les décisions, les contournements, les petites commodités qui s'accumulent sur des centaines de pages.

C'est devenu sa propre chose en chemin, mais c'est né d'une démangeaison que tout développeur Eleventy reconnaît : recâbler les mêmes choses sur son troisième nouveau projet et se demander s'il n'y a pas une meilleure façon de conserver ce travail.

Mettre la connaissance en code est la moitié facile. Lui trouver la bonne forme, quoi nommer, quoi regrouper, ce qui appartient au plugin et ce qui appartient à la documentation, c'est la moitié difficile, et elle est toujours en mouvement.

Aujourd'hui, Baseline est un plugin opérationnel qui gère les décisions structurelles d'un projet Eleventy : des choses comme les largeurs d'images responsives, les balises `head` dont chaque site a besoin, les sitemaps par langue avec `x-default`, les brouillons tenus hors production.

Il est livré en continu sur npm en `0.1.0-next.X` et tourne en production sur son propre site de documentation, sur [a pleasant view](https://www.apleasantview.com), et sur des sites clients. Le code est stable. L'architecture est posée. Les mots autour rattrapent encore leur retard.

---

## Eleventy et le fossé pédagogique

À l'époque où l'idée du plugin prenait forme, j'ai essayé d'être plus actif sur le Discord d'Eleventy, en donnant un coup de main sur le canal support. De vieux réflexes de support technique sont revenus, et de vieilles frustrations aussi. Des membres de la communauté déroulent des fils de soixante messages pour aider quelqu'un à s'en sortir. C'est admirable. C'est aussi épuisant. Ma parade récente, c'est de déposer des liens vers la documentation.

Mais la documentation d'11ty est difficile à parcourir si vous ne savez pas ce que vous cherchez. En partie parce qu'Eleventy est si peu directif sur la structure d'un site qu'il n'existe pas de chemin canonique. Et en partie parce que la documentation est un monolithe qu'une pull request opportuniste ne répare pas. Il faudrait une vraie discussion entre mainteneurs pour la restructurer.

Eleventy laisse ses décisions structurelles ouvertes, volontairement. C'est sa force pour les développeurs expérimentés et son mur pour tous les autres. Baseline peut être ce qui comble ce fossé : voici une bonne façon de faire, voici pourquoi, et voici où la changer quand vous serez prêt.

La comparaison ne se fait pas avec les autres plugins Eleventy. C'est Nuxt, Astro, Hugo. Des outils qui raccourcissent la distance entre « installé » et « en train de construire ».

---

## Où cela va

L'architecture continue de se remodeler en même temps que les fonctionnalités : des pièces fondatrices sont promues au rang de couches à part entière, les frontières entre modules se précisent, des choses sont renommées. Chaque pièce commence petite et intentionnelle, et évolue avec ce dont le projet a réellement besoin.

Autre chose me travaille depuis un moment : Eleventy n'est presque jamais cité aux côtés d'Astro et de Hugo, et Astro est arrivé plus tard pour le dépasser presque aussitôt. Le plugin ne règle pas ça. Mais l'intuition qui porte ce travail, c'est que l'écart n'est pas une question de capacité. C'est cette même distance, celle entre « je l'ai installé » et « j'ai un site qui tourne ». Astro la referme d'emblée. Baseline essaie de la refermer pour Eleventy.

La couche SEO a atterri en juin : `<baseline-head>` émet désormais le graphe de données structurées, les balises sociales et le lien canonique, sans câblage par site. Prochaine étape à l'horizon : un module de gestion des médias.

---

Si tout cela vous semble utile, la documentation est sur [eleventy-baseline.dev](https://www.eleventy-baseline.dev/). Le plugin est sur npm sous `@apleasantview/eleventy-plugin-baseline`. Les versions sortent en continu en `0.1.0-next.X`. Épinglez une version quand vous construisez quelque chose de sérieux par-dessus.
