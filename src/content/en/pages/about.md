---
title: 'About Eleventy Baseline'
slug: 'about'
description: 'How a personal client-work starter became an opinionated infrastructure plugin for Eleventy.'
date: 2026-05-23
permalink: '/about/'
translationKey: 'about'
type: 'about'
---

_Baseline is an opinionated Eleventy plugin that handles the structural decisions you'd otherwise wire up on every project. Looking for the marketing pitch? It's over on the [docs overview](https://www.eleventy-baseline.dev/docs/introduction/overview/)._

_This page is the longer, more honest story._

---

## From starter to plugin

Baseline started as my hundredth attempt at making a starter for client work, this time trying to be properly serious about it. The first version sat dormant for a while, but I kept coming back to it. It had one eye on the patterns and tooling already (silently) established in the Eleventy community.

The other eye was on what was missing for me: keeping client sites in sync without copying and rewriting files across projects, the per-language sitemaps I missed from Hugo, the single settings shape that WordPress gets right.

The shape clicked while I was thinking about something Zach Leatherman, Eleventy's creator, has said: that everything in Eleventy is essentially a plugin. I'm paraphrasing, but that was the moment it stopped being a starter in my head.

The rewrite landed on the 1st of December 2025 as a single commit, "Rewrite baseline as a plugin." I announced the project on the Eleventy Discord shortly after, on the chance it might be useful to other people too.

That shift changed what the project needed to be. A personal starter can be implicit. You know why things are the way they are because you put them there. A plugin can't coast on that. Other people need to understand the choices, or at least trust them enough to get started.

The system has grown through use. Modules added when the project needed them, each with its own decisions, each leaning on the others. The starter became a system. Gradually, then all at once.

The framing shifted along with it. The earlier description called Baseline a "thin, optional wiring layer." That was true once. By April 2026 it had become an opinionated starting point. The value isn't that it's thin. The value is that these decisions are made, they work together, and the path to change one is clear when you disagree.

What's in Baseline now is most of what I've learned about building with Eleventy, and underneath that, fifteen years of working in tech, mostly but not only on the web. The decisions, the workarounds, the small conveniences that compound over hundreds of pages.

It evolved into its own thing along the way, but it grew out of an itch every Eleventy developer recognises: wiring up the same things on the third new project and wondering if there's a better way to keep that work.

Putting the knowledge into code is the easier half. Finding the right shape for it, what to name, what to group, what belongs in the plugin and what belongs in the docs, is the harder one, and it's still in motion.

Today Baseline is a working plugin handling structural decisions for an Eleventy project: things like responsive image widths, the head tags every site needs, per-language sitemaps with `x-default`, drafts kept out of production.

It ships continuously on npm as `0.1.0-next.X` and runs in production on its own docs site, on [a pleasant view](https://www.apleasantview.com), and on client sites. The code is stable. The architecture is settled. The words around it are still catching up.

---

## Eleventy and the educational gap

Around the time the plugin idea was forming, I tried to be more active in the Eleventy Discord, chipping in on the support channel. Old tech-support reflexes came back, and so did an old frustrations. Community members run sixty-message threads to help an OP through. It's commendable. It's also exhausting. My recent coping move is to drop documentation links.

But the 11ty docs are hard to navigate if you don't know what you're looking for. Partly because Eleventy is so unopinionated about site structure that there's no canonical path through. And partly because the docs are a monolith that doesn't get fixed by an opportunistic pull request. They'd need an active maintainer discussion to restructure.

Eleventy leaves its structural decisions open on purpose. That's its strength for experienced developers and its wall for everyone else. Baseline can be the thing that fills that gap: here's one good way to do it, here's why, and here's where to change it when you're ready.

The comparison isn't other Eleventy plugins. It's Nuxt, Astro, Hugo. Tools that shorten the distance between "installed" and "building."

---

## Where it's heading

The architecture keeps reshaping itself alongside the features: founding pieces get promoted to first-class layers, module boundaries get clearer, things get renamed. Each piece starts small and intentional, and evolves along what the project actually needs.

One other thing has nagged me for a while: Eleventy almost never gets named alongside Astro and Hugo, and Astro arrived later and overtook it almost immediately. The plugin doesn't fix that. But the hunch driving the work is that the gap isn't about capability. It's about that same distance, the one between "I've installed it" and "I've got a site running." Astro closes it out of the box. Baseline tries to close it for Eleventy.

Next on the horizon: getting SEO right, and possibly a media management module.

---

If any of this sounds useful, the docs are at [eleventy-baseline.dev](https://www.eleventy-baseline.dev/). The plugin is on npm as `@apleasantview/eleventy-plugin-baseline`. Releases roll continuously as `0.1.0-next.X`. Pin a version when you build something serious on top.
