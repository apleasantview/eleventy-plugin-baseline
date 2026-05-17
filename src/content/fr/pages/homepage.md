---
title: 'Eleventy Baseline'
slug: 'homepage'
description: "Eleventy Baseline est un plugin pour Eleventy qui fournit une fondation de site prête à l'emploi, avec les assets, les métadonnées et un graphe de contenu vivant qui maintient la sortie rendue synchronisée."
date: 2026-05-17
permalink: '/fr/'
translationKey: homepage
layout: 'layouts/page.njk'
---

Chaque site Eleventy en production reconstruit la même fondation : compilation des assets, balises `head`, sitemap, gestion des images. Les mêmes fondations à refaire à chaque fois.

Et chaque site se heurte à la même limite. Votre front matter est lisible depuis n'importe où. La sortie rendue, non. Alors vous finissez par réécrire les mêmes contournements : un index de backlinks construit à partir des noms de fichiers, une table des matières reparsée depuis le Markdown, des données structurées rédigées à la main page par page. Tout cela tourne en parallèle de la sortie rendue, et se désynchronise dès qu'on renomme quoi que ce soit.

Eleventy Baseline fournit les deux, prêts dès le premier jour. Déjà construits, avec un reflet vivant de tout ce que vous rendez. Votre projet reste le vôtre.

---

## En pratique

Baseline est une fondation opérationnelle pour les sites Eleventy.

Les images sont rendues aux bonnes largeurs dans des formats modernes, en lazy loading par défaut. Les liens entre pages vivent par leur nom : déplacer un dossier ne les casse pas. Les balises `head` se remplissent depuis un seul fichier de réglages, avec des surcharges au niveau de la page là où c'est nécessaire.

Vos layouts, vos styles, vos scripts et votre structure éditoriale restent les vôtres. Gardez les valeurs par défaut là où elles aident, et surchargez là où vous en avez besoin.

---

## Construit sur Baseline

Le site que vous lisez tourne sur Baseline. Ce que vous regardez, c'est le système lui-même en usage, pas une illustration de celui-ci.

Ouvrez n'importe quelle page de la documentation et essayez : la table des matières est construite à partir du HTML rendu, le pied de page "Linked from" lit le graphe de contenu, le sélecteur de langue lit les réglages. Le tout câblé par le même système dont vous êtes en train de lire la description.

Regardez le code source. Parcourez le dépôt. Lancez-le en local. Tout est visible.

---

## L'architecture en trois couches

Les responsabilités restent séparées, et chaque couche a une seule tâche. Les changements restent prévisibles à mesure que le site grandit.

### State

Vos réglages et options, normalisés une fois au démarrage. Chaque module lit la même forme.

### Runtime

Ce que le build sait de lui-même : les templates, les traductions, le graphe de contenu. Les modules lisent ici plutôt que les uns chez les autres.

### Modules

Les fonctionnalités qui lisent dans les deux : `assets`, `head`, `multilang`, `navigator`, `sitemap`. Aucun ne s'appelle l'un l'autre ; chacun lit ce dont il a besoin dans le runtime.

Détail complet dans la [[docs | documentation]].

---

## Installer et démarrer

Installez les paquets, enregistrez Baseline dans votre configuration Eleventy, et lancez le serveur de développement.

```bash
npm install @11ty/eleventy @11ty/eleventy-img
npm install @apleasantview/eleventy-plugin-baseline
npm run dev
```

Le [[quickstart | guide de démarrage rapide]] détaille l'installation complète. La [[docs | documentation]] couvre les modules et l'architecture. Le [[simple-baseline-site | tutoriel simple-site]] construit un petit site à partir de zéro.

### Versions glissantes

Baseline est livré en continu. Chaque version fait avancer le travail, étiquetée `0.1.0-next.X`. La prochaine version stable arrivera en même temps qu'Eleventy v4. Épinglez une version quand vous construisez quelque chose de sérieux par-dessus.

Si la documentation décrit un comportement que vous n'arrivez pas à reproduire, c'est probablement la documentation qui a tort. Merci d'[ouvrir une issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues).

Support commercial disponible auprès de [a pleasant view](https://www.apleasantview.com).
