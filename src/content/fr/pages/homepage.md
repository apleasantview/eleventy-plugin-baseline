---
title: 'Eleventy Baseline'
slug: 'home'
description: 'Eleventy Baseline est un build framework pour Eleventy. Assets, balises head, sitemaps et données structurées, prêts dès le premier build.'
date: 2026-05-17
seo:
  title: 'Eleventy Baseline : un framework de build pour Eleventy'
permalink: '/fr/'
translationKey: homepage
layout: 'layouts/home.njk'
---

<div class="reveal-stagger u-flow">

<div class="c-breadcrumbs" style="--i: 1;"><a href="/release-notes/">v{{ _baseline.version }} est sortie</a></div>

<div class="u-flow" style="--i: 1;">

# Le build framework pour les sites Eleventy.

{{ settings.languages[lang].tagline }} {style="--flow-space-heading:0.5em"}

```bash
npm install @11ty/eleventy
npm install @apleasantview/eleventy-plugin-baseline
```

Installez les paquets, enregistrez Baseline dans votre configuration Eleventy, et lancez le serveur de développement. Le [[quickstart | guide de démarrage rapide]] détaille l'installation complète.

Plutôt construire que lire ? Le [[tutorial | tutoriel]] part d'un dossier vide et aboutit à une page d'accueil, une page, un article et une deuxième langue, en expliquant chaque décision au moment où il la prend.

Si vous débutez avec Eleventy, le [[introduction | chapitre d'introduction]] vous met sur les rails.

</div>

---

<div class="u-flow" style="--i: 2;">

Eleventy est un générateur de sites statiques qui vous laisse les décisions structurelles. La plupart des projets Eleventy finissent par prendre les mêmes : un pipeline d'assets, les images, les balises head, les données structurées, le multilingue, les sitemaps.

Baseline, ce sont ces décisions déjà prises et assemblées dans un seul plugin, en suivant les conventions d'Eleventy. Un framework par ce qu'il décide, un plugin par sa façon de s'installer.

</div>

---

<div class="u-flow" style="--i: 3;">

## Construit sur des standards et des conventions

Baseline se pose sur Eleventy plutôt qu'autour. La data cascade, les langages de template et l'API de plugins restent exactement tels que documentés : ce que vous savez déjà s'applique toujours. Le Markdown et le front matter sont la source de vérité, Nunjucks là où une page a besoin de logique. D'abord le HTML, puis le CSS, puis le JavaScript là où la page le mérite.

Baseline n'impose ni composants, ni méthodologie CSS, ni framework frontend, et ne livre aucun runtime côté client.

Sous le capot : [Eleventy](https://www.11ty.dev/) · [[image-shortcode | eleventy-img]] · [[content-helpers | Markdown]] · [[globals | Nunjucks]] · [[assets-pipeline | PostCSS]] · [[assets | esbuild]]

</div>

---

<div class="u-flow" style="--i: 4;">

## Tourne sur Baseline

Le site que vous lisez tourne sur Baseline. Ouvrez n'importe quelle page de la documentation : la table des matières est construite à partir du HTML rendu, le pied de page "Linked from" lit le graphe de contenu, et les données structurées dans le `head` sont ce même graphe, projeté pour les moteurs de recherche.

Regardez le code source. Parcourez le dépôt. Lancez-le en local.

[[about:fr | Lisez l'histoire qui va avec]].

</div>

---

<div class="u-flow" style="--i: 5;">

## Versions glissantes

Baseline est livré en continu. Chaque version fait avancer le travail, étiquetée `0.1.0-next.X`. Les changements cassants arrivent avec la ligne que vous devez modifier, écrite noir sur blanc dans les [notes de version](/release-notes/). Épinglez une version quand vous construisez quelque chose de sérieux par-dessus.

</div>

---

<div class="u-flow" style="--i: 6;">

## Open source

Baseline est sous licence MIT et gratuit, développé au grand jour et maintenu par [a pleasant view](https://www.apleasantview.com).

Pour l'aide de la communauté et les questions sur Eleventy lui-même, rejoignez le serveur [Discord d'Eleventy](https://www.11ty.dev/blog/discord/).

Un [[commercial-support:fr | support commercial]] est disponible directement auprès du mainteneur.

Pour un bug ou une erreur dans la documentation, [ouvrez une issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues). Si la documentation décrit un comportement que vous n'arrivez pas à reproduire, c'est probablement la documentation qui a tort.

</div>

</div>
