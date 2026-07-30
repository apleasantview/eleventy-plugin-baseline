---
title: 'Eleventy Baseline'
slug: 'home'
description: 'Eleventy Baseline est un build framework pour Eleventy. Assets, balises head, sitemaps et données structurées, prêts dès le premier build.'
date: 2026-05-17
permalink: '/fr/'
translationKey: homepage
layout: 'layouts/home.njk'
---

<small><a href="/release-notes">v{{ _baseline.version }} est sortie</a></small>

# Le build framework pour les sites Eleventy.

{{ settings.languages[lang].tagline }} {style="--flow-space-heading:0.5em"}

Eleventy est un générateur de sites statiques qui vous laisse les décisions structurelles. La plupart des projets Eleventy finissent par prendre les mêmes : un pipeline d'assets, les images, les balises head, les données structurées, le multilingue, les sitemaps.

Baseline, ce sont ces décisions déjà prises et assemblées dans un seul plugin, en suivant les conventions d'Eleventy. Un framework par ce qu'il décide, un plugin par sa façon de s'installer.

---

## Installer et démarrer

```bash
npm install @11ty/eleventy @11ty/eleventy-img
npm install @apleasantview/eleventy-plugin-baseline
```

Installez les paquets, enregistrez Baseline dans votre configuration Eleventy, et lancez le serveur de développement. Le [[quickstart | guide de démarrage rapide]] détaille l'installation complète.

Si vous débutez avec Eleventy, le [[introduction | chapitre d'introduction]] vous met sur les rails.

---

## Ce que vous obtenez

### Assets

Le pipeline d'assets, déjà branché. Un point d'entrée par dossier d'assets : `index.css` passe par PostCSS, `index.js` par esbuild. Les images sont rendues aux bonnes largeurs dans des formats modernes, en lazy loading par défaut.

### SEO

Les balises `head` se remplissent depuis un seul fichier de réglages, avec des surcharges au niveau de la page là où c'est nécessaire. `<baseline-head>` émet un lien canonique, l'Open Graph, les Twitter Cards et un graphe JSON-LD de données structurées, sans câblage page par page.

La construction des données structurées suit le modèle de `seo-graph-core`, de Joost de Valk, de Yoast.

### Multilingue

Support multilingue basé sur les dossiers : collections par langue, table de traductions, hreflang et filtres i18n. Les sitemaps arrivent par langue, avec un index par-dessus.

---

## Un seul graphe de contenu en dessous

Les backlinks, les wikilinks qui survivent au déplacement d'un dossier, le fil d'Ariane et les données structurées dans le `head` sont tous des projections d'un même graphe de contenu.

Sans lui, chacun d'eux devient une chose à maintenir à la main : un index de backlinks construit à partir des noms de fichiers, une table des matières reparsée depuis le Markdown, des données structurées écrites page par page. Tout cela se désynchronise dès que vous renommez un fichier.

Baseline construit ce graphe à partir du HTML une fois rendu : il correspond donc toujours à ce que vous avez réellement livré.

---

## Construit sur des standards et des conventions

Baseline se pose sur Eleventy plutôt qu'autour. La data cascade, les langages de template et l'API de plugins restent exactement tels que documentés : ce que vous savez déjà s'applique toujours. Le Markdown et le front matter sont la source de vérité, Nunjucks là où une page a besoin de logique. D'abord le HTML, puis le CSS, puis le JavaScript là où la page le mérite.

Baseline n'impose ni composants, ni méthodologie CSS, ni framework frontend, et ne livre aucun runtime côté client.

Sous le capot : [Eleventy](https://www.11ty.dev/) · [[image-shortcode | eleventy-img]] · [[content-helpers | Markdown]] · [[globals | Nunjucks]] · [[assets-pipeline | PostCSS]] · [[assets | esbuild]]

---

## Tourne sur Baseline

Le site que vous lisez tourne sur Baseline. Ouvrez n'importe quelle page de la documentation : la table des matières est construite à partir du HTML rendu, le pied de page "Linked from" lit le graphe de contenu, et les données structurées dans le `head` sont ce même graphe, projeté pour les moteurs de recherche.

Regardez le code source. Parcourez le dépôt. Lancez-le en local.

[[about:fr | Lisez l'histoire qui va avec]].

---

## Open source

Baseline est sous licence MIT et gratuit, développé au grand jour et maintenu par [a pleasant view](https://www.apleasantview.com).

Un [[commercial-support:fr | support commercial]] est disponible directement auprès du mainteneur.

## Versions glissantes

Baseline est livré en continu. Chaque version fait avancer le travail, étiquetée `0.1.0-next.X`. Les changements cassants arrivent avec la ligne que vous devez modifier, écrite noir sur blanc dans les [notes de version](/release-notes/). Épinglez une version quand vous construisez quelque chose de sérieux par-dessus.

Si la documentation décrit un comportement que vous n'arrivez pas à reproduire, c'est probablement la documentation qui a tort. Merci d'[ouvrir une issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues).
