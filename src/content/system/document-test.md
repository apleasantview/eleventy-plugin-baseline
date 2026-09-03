---
title: 'Document test'
slug: 'document-test'
description: 'Every piece of markup the docs site renders: headings, prose, blocks, tables and code.'
date: 2026-08-16
---

Every piece of markup a page here can render, once each. The tokens underneath it live on the [profile test](/system/profile-test/).

Nothing on this page is styled specially. If something looks wrong here, it looks wrong everywhere.

## Headings

The page title above is the `h1`. Everything below is what a document body can use.

## Heading level two

### Heading level three

#### Heading level four

Only `h1` to `h3` are styled deliberately. An `h4` falls back to the browser default at the inherited colour, which is worth revisiting the day a page needs one.

## Prose

A paragraph of body copy, which is where most of the site lives. It carries [a link to the homepage](/), some `inline code`, a bit of **strong emphasis** and some _italic_ for good measure. Long enough to wrap, so the measure and the line height can be judged against each other rather than in the abstract.

A second paragraph, to show the flow spacing between siblings rather than the spacing after a heading. The two are different values on purpose: `--flow-space` between paragraphs, `--flow-space-heading` above a heading.

### Lists

- An unordered list
- With a second item
- And a third that runs on a little longer, so the wrapping and the hanging indent are both visible

1. An ordered list
2. With a second item
3. And a third

- A list with a nested one
  - The nested item
  - And its sibling
- Back to the outer level

### Quotes and rules

> A plain blockquote, with no alert class on it. This is the base the four alert variants are built from.

---

That was an `hr`.

### Wikilinks

Wikilinks resolve against the content graph: [[quickstart | this one]] points at another page by its slug rather than by a path.

## Blocks

### Deck

{% deckBlock %}
A deck is the editorial summary that sits under a heading. Smaller, muted, and set at the snug flow spacing so it reads as a subtitle rather than a paragraph.
{% enddeckBlock %}

### Alerts

{% alertBlock "info" %}
**Info.** The default. Accent border, used for asides and pointers.
{% endalertBlock %}

{% alertBlock "success" %}
**Success.** For confirmations and things that went right.
{% endalertBlock %}

{% alertBlock "warning" %}
**Warning.** For sharp edges that will not stop the build.
{% endalertBlock %}

{% alertBlock "danger" %}
**Danger.** For the ones that will.
{% endalertBlock %}

An alert can carry a heading and more than one paragraph.

{% alertBlock "info" %}

#### Alerts with a heading

The heading sits inside the blockquote, and the block grows to fit rather than staying at its fitted width.

A second paragraph, so the flow spacing inside an alert can be judged as well as the spacing around it.

{% endalertBlock %}

### Steps

The default variant, for a numbered walkthrough.

{% stepsBlock %}

1. The first step, with room to breathe between items.
2. The second step, which carries a second paragraph.

   That paragraph sits closer to its step than the steps sit to each other.

3. The third step.

{% endstepsBlock %}

The compact variant, for a checklist rather than a sequence.

{% stepsBlock "compact" %}

- A first item, short
- A second, carrying some `inline code`
- A third that runs on a little longer, so a wrapping item can be seen against the ones that do not

{% endstepsBlock %}

## Tables

Header rule, striped rows, closing rule. No vertical borders: the stripes carry the row-to-row scanning.

| Token               | Role                     | Default                     |
| ------------------- | ------------------------ | --------------------------- |
| `--table-border`    | Header and closing rules | `--color-border-subtle`     |
| `--table-bg-odd`    | Stripe on odd rows       | `--color-background-subtle` |
| `--table-bg-even`   | Stripe on even rows      | `transparent`               |
| `--table-header-bg` | Header row fill          | `transparent`               |
| `--table-text`      | Cell colour              | `currentColor`              |

Wrapped in `tableBlock` with `responsive` set, a wide table scrolls sideways instead of pushing the layout.

{% tableBlock true %}

| Column | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- |
| `first` | string | none | yes | A short cell |
| `second` | boolean | `false` | no | A cell carrying some `inline code` |
| `third` | number | `0` | no | A longer cell, so the column has to make room for it |
| `fourth` | array | `[]` | no | A short cell again |
| `fifth` | object | `{}` | no | The last row, sitting against the closing rule |

{% endtableBlock %}

## Code

Inline `code` sits in a paragraph. Fenced blocks get Prism, server-side, with `tabindex` set so a scrolling block is reachable by keyboard.

```js
export default {
	title: 'A document',
	items: ['one', 'two', 'three'],
	enabled: true
};
```

```bash
npm install a-package
```

```json
{
	"name": "a-package",
	"type": "module"
}
```

```text
A plain text block, which gets no highlighting at all.
```

## Images

{% image {
  src: "/media/example.jpg",
  alt: "A descriptive alt text for accessibility",
  caption: "With a caption, the shortcode wraps the image in a figure."
} %}

The `image` shortcode runs through eleventy-img, so that is a responsive `<picture>` with avif, webp and jpeg sources rather than a bare `<img>`. Without a `caption` it renders the picture on its own.

{% image {
  src: "/media/example.jpg",
  alt: "The same image again, without a caption"
} %}
