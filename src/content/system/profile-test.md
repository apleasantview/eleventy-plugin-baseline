---
title: 'Profile test'
slug: 'profile-test'
description: 'Every design token the site defines, grouped by tier: raw primitives, semantic roles, and the applied values on top.'
date: 2026-08-17
---

Every token the site defines, in the three tiers it is organised in. **Primitives** are raw values with no meaning attached. **Semantics** are the roles components reach for, each pointing at a primitive. **Applied** is the thin layer on top, in `document/tokens.css`.

Flip the theme switcher to check both palettes, and resize the window to watch the fluid scales move. A token whose value reads `unset` is defined nowhere the bundle can see.

<style>
	.sg-chip {
		display: block;
		width: 4rem;
		height: 1.5rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.25rem;
		/* Chequerboard behind the fill, so anything transparent shows it. */
		background-image: linear-gradient(45deg, var(--color-border-subtle) 25%, transparent 25%),
			linear-gradient(-45deg, var(--color-border-subtle) 25%, transparent 25%);
		background-size: 0.6rem 0.6rem;
	}
	.sg-chip > span {
		display: block;
		height: 100%;
		border-radius: 0.15rem;
	}
	.sg-value {
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.sg-bar {
		height: 1rem;
		min-width: 1px;
		background: var(--color-accent-solid);
		border-radius: 0.125rem;
	}

	summary > * {
		display: inline-block;
	}
</style>

{% macro chip(token) -%}
<span class="sg-chip" data-token="{{ token }}"><span style="background: var({{ token }})"></span></span>
{%- endmacro %}

{% macro sample(tokens, prop, text, extra) -%}
<div class="u-overflow--x"><table><thead><tr><th>Token</th><th>Value</th><th>Sample</th></tr></thead><tbody>
{%- for t in tokens %}
<tr><td><code>{{ t }}</code></td><td class="sg-value" data-token="{{ t }}"></td><td style="{{ prop }}: var({{ t }}){% if extra %}; {{ extra }}{% endif %}">{{ text }}</td></tr>
{%- endfor %}
</tbody></table></div>
{%- endmacro %}

{% macro bars(tokens) -%}
<div class="u-overflow--x"><table><thead><tr><th>Token</th><th>Value</th><th>Size</th></tr></thead><tbody>
{%- for t in tokens %}
<tr><td><code>{{ t }}</code></td><td class="sg-value" data-token="{{ t }}"></td><td><div class="sg-bar" style="width: min(var({{ t }}), 100%)"></div></td></tr>
{%- endfor %}
</tbody></table></div>
{%- endmacro %}

## Primitives

Raw values, no meaning attached. Nothing in a component should name one of these directly.

### Colour

Source: `profile/primitives/colors.css`. Eleven rungs per ramp, lightness steps shared across every ramp; chroma peaks where each hue can hold it in sRGB, which is why yellow tops out lighter than red.

Ink is the exception, and is listed last for it. Its steps are compressed into the dark half of the range, so its rungs mean something different from everyone else's and it carries its own descriptions.

{% set rungs = [
	['50', 'Lightest tint. Callout and alert backgrounds.'],
	['100', 'Tint. Subtle page and surface fills.'],
	['200', 'Tint. Surfaces and the lightest borders.'],
	['300', 'Light. Borders and hover surfaces.'],
	['400', 'Mid-light. Borders that need to be seen.'],
	['500', 'Peak chroma. The hue at full strength.'],
	['600', 'Mid-dark. Hover state for the solid.'],
	['700', 'Dark. Text on a light background.'],
	['800', 'Darker. Dark theme surfaces in the colour families.'],
	['900', 'Near-black. Light theme text, and dark theme subtle fills.'],
	['950', 'Darkest. Dark theme backgrounds in the colour families.']
] %}

<details>
<summary>

#### Black and white

</summary>

{% tableBlock true %}

| Token | Swatch | Description |
| --- | --- | --- |
| `--color-black` | {{ chip('--color-black') }} | Pure black. No role maps to it. |
| `--color-white` | {{ chip('--color-white') }} | Pure white. Carries text on solid fills. |

{% endtableBlock %}

</details>

{% set ramps = [
	['neutral', 'Neutral', 'Warm, hue 95. Surfaces and borders.'],
	['slate', 'Slate', 'Cool, hue 255. Text, and the light theme surfaces.'],
	['blue', 'Blue', 'Hue 255. Links and primary actions.'],
	['green', 'Green', 'Hue 150. Success.'],
	['yellow', 'Yellow', 'Hue 95. Warnings. Chroma peaks at 300 to 400, not 500.'],
	['red', 'Red', 'Hue 30. Errors.']
] %}

{% for ramp in ramps %}

<details>
<summary>

#### {{ ramp[1] }}

</summary>

{{ ramp[2] }}

{% tableBlock true %}

| Token | Swatch | Description |
| --- | --- | --- |
{%- for rung in rungs %}
| `--color-{{ ramp[0] }}-{{ rung[0] }}` | {{ chip('--color-' + ramp[0] + '-' + rung[0]) }} | {{ rung[1] }} |
{%- endfor %}

{% endtableBlock %}

</details>
{% endfor %}

{% set inkRungs = [
	['50', 'Lightest. Body text.'],
	['100', 'Solid fills. Buttons and badges.'],
	['200', 'That fill under the pointer.'],
	['300', 'Held in reserve.'],
	['400', 'Muted text. Captions and metadata.'],
	['500', 'Held in reserve.'],
	['600', 'Pressed surfaces, and borders under the pointer.'],
	['700', 'Surfaces under the pointer, and borders.'],
	['800', 'Raised surfaces, and the dividers you barely notice.'],
	['900', 'One step off the page.'],
	['950', 'The page itself, and text sitting on a solid fill.']
] %}

<details>
<summary>

#### Ink

</summary>

Cool, hue 255. The dark theme's neutral family, and the only ramp that sets its own lightness steps. Slate's hue and chroma with the range compressed into the dark half, modelled on GitHub's dark dimmed, which is soft by spread rather than by tint. Flip to the dark theme to see these doing their job.

{% tableBlock true %}

| Token | Swatch | Description |
| --- | --- | --- |
{%- for rung in inkRungs %}
| `--color-ink-{{ rung[0] }}` | {{ chip('--color-ink-' + rung[0]) }} | {{ rung[1] }} |
{%- endfor %}

{% endtableBlock %}

</details>

### Type

Source: `profile/primitives/typography.css`.

<details>
<summary>

#### Families

</summary>

{{ sample(['--font-family-sans', '--font-family-mono'], 'font-family', 'Baseline sets the table') }}

</details>

<details>
<summary>

#### Fixed scale

</summary>

The rem scale. For anything that should not move with the viewport.

{{ sample(['--font-size--2', '--font-size--1', '--font-size-0', '--font-size-1', '--font-size-2', '--font-size-3', '--font-size-4', '--font-size-5'], 'font-size', 'Baseline sets the table') }}

</details>

<details>
<summary>

#### Fluid scale

</summary>

The Utopia scale, interpolating between 320px and 1280px at 14px to 16px, ratio 1.125. These are what the size roles read, so this is the set to watch while resizing.

{{ sample(['--font-size-fluid--2', '--font-size-fluid--1', '--font-size-fluid-0', '--font-size-fluid-1', '--font-size-fluid-2', '--font-size-fluid-3', '--font-size-fluid-4', '--font-size-fluid-5'], 'font-size', 'Baseline sets the table') }}

</details>

<details>
<summary>

#### Weights

</summary>

{{ sample(['--font-weight-light', '--font-weight-normal', '--font-weight-medium', '--font-weight-semibold', '--font-weight-bold'], 'font-weight', 'Baseline sets the table') }}

Weight has no semantic layer on purpose: the primitives are already the application keywords, so a role would only rename them.

</details>

<details>
<summary>

#### Line height

</summary>

{{ sample(['--line-height-flush', '--line-height-tight', '--line-height-normal', '--line-height-loose'], 'line-height', 'Baseline sets the table, and this line wraps so the leading is visible rather than theoretical.', 'max-width: 34ch') }}

</details>

<details>
<summary>

#### Tracking

</summary>

{{ sample(['--letter-spacing-tight', '--letter-spacing-normal', '--letter-spacing-loose', '--letter-spacing-wide', '--letter-spacing-wider'], 'letter-spacing', 'Baseline sets the table') }}

</details>

### Space

Source: `profile/primitives/spacing.css`.

<details>
<summary>

#### Named edges

</summary>

Two values outside the rhythm. `--space-void` is a deliberate absence rather than a forgotten zero; `--space-hairline` is one device pixel and does not scale with rem.

{{ bars(['--space-void', '--space-hairline']) }}

</details>

<details>
<summary>

#### The rhythm

</summary>

Fixed rem steps, numbered by their 4px multiple.

{{ bars(['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7', '--space-8', '--space-12', '--space-16', '--space-32']) }}

</details>

<details>
<summary>

#### Fluid steps

</summary>

{{ bars(['--space-fluid-1', '--space-fluid-2', '--space-fluid-3', '--space-fluid-4', '--space-fluid-5', '--space-fluid-6', '--space-fluid-7', '--space-fluid-8', '--space-fluid-9']) }}

</details>

<details>
<summary>

#### Fluid pairs

</summary>

One-up pairs interpolate between two adjacent steps as the viewport grows. The custom pairs jump further.

{{ bars(['--space-fluid-1-2', '--space-fluid-2-3', '--space-fluid-3-4', '--space-fluid-4-5', '--space-fluid-5-6', '--space-fluid-6-7', '--space-fluid-7-8', '--space-fluid-8-9', '--space-fluid-4-6', '--space-fluid-4-7', '--space-fluid-4-8']) }}

</details>

---

## Semantics

The roles components actually name. Each points at a primitive, so swapping a theme swaps the mapping and never the role.

### Colour

Source: `profile/semantic/colors.css`. Thirteen roles, repeated across five families. The role says what a thing is for; the family says which register it speaks in.

{% set roles = [
	['background', 'The page itself.'],
	['background-subtle', 'A quieter background, one step off the page.'],
	['surface', 'A raised thing sitting on the page.'],
	['surface-hover', 'That surface under the pointer.'],
	['surface-active', 'That surface while pressed.'],
	['border-subtle', 'A divider you should barely notice.'],
	['border', 'A border that defines an edge.'],
	['border-hover', 'That border under the pointer.'],
	['solid', 'A filled, saturated block. Buttons and badges.'],
	['solid-hover', 'That fill under the pointer.'],
	['on-solid', 'Text and icons sitting on the solid fill.'],
	['text-muted', 'Secondary text. Captions, metadata.'],
	['text', 'Body text.']
] %}
{% set families = [
	['color', 'Neutral', 'The default register. Page chrome, body text, dividers.'],
	['color-accent', 'Accent', 'Blue. Links, primary actions, the info alert.'],
	['color-success', 'Success', 'Green. Confirmations, and the success alert.'],
	['color-warning', 'Warning', 'Yellow. Sharp edges that will not stop the build.'],
	['color-error', 'Error', 'Red. Failures, and the danger alert.']
] %}
{% for family in families %}

<details>
<summary>

#### {{ family[1] }}

</summary>

{{ family[2] }}

{% tableBlock true %}

| Token | Swatch | Description |
| --- | --- | --- |
{%- for role in roles %}
| `--{{ family[0] }}-{{ role[0] }}` | {{ chip('--' + family[0] + '-' + role[0]) }} | {{ role[1] }} |
{%- endfor %}

{% endtableBlock %}

</details>
{% endfor %}

### Type

Source: `profile/semantic/typography.css`.

<details>
<summary>

#### Families

</summary>

Three names so any one of them can move without the others.

{{ sample(['--font-family-body', '--font-family-heading', '--font-family-code'], 'font-family', 'Baseline sets the table') }}

</details>

<details>
<summary>

#### Sizes

</summary>

What the site reaches for when it wants a size. Each maps onto a fluid step.

{{ sample(['--text-size-muted', '--text-size-secondary', '--text-size-code', '--text-size-body', '--text-size-lede', '--text-size-title', '--text-size-display'], 'font-size', 'Baseline sets the table') }}

</details>

<details>
<summary>

#### Line height and tracking

</summary>

{{ sample(['--text-lineheight-heading', '--text-lineheight-code', '--text-lineheight-loose'], 'line-height', 'Baseline sets the table, and this line wraps so the leading is visible rather than theoretical.', 'max-width: 34ch') }}

`--text-lineheight-body` is listed under Applied below, because `document/tokens.css` redefines it.

{{ sample(['--text-letterspacing-body', '--text-letterspacing-heading'], 'letter-spacing', 'Baseline sets the table') }}

Both are `wide` today. Two names because they could diverge tomorrow, the way `--font-family-heading` can.

</details>

<details>
<summary>

#### Measure and links

</summary>

`--text-inlinesize-body` caps the reading measure; `--text-inlinesize-heading` is `fit-content`. Link underlines are tuned through the two `--link-underline-*` values.

{{ bars(['--text-inlinesize-body', '--link-underline-thickness', '--link-underline-offset']) }}

</details>

### Space

Source: `profile/semantic/spacing.css`. Three axes: `inset` is padding inside a container, `gap` is the space between items in a row, `flow` is vertical rhythm between prose.

<details>
<summary>

#### Inset

</summary>

{{ bars(['--space-inset-3xs', '--space-inset-2xs', '--space-inset-xs', '--space-inset-s', '--space-inset-m', '--space-inset-l', '--space-inset-xl', '--space-inset-2xl', '--space-inset-3xl']) }}

</details>

<details>
<summary>

#### Gap

</summary>

{{ bars(['--space-gap-2xs', '--space-gap-xs', '--space-gap-s', '--space-gap-m', '--space-gap-l']) }}

</details>

<details>
<summary>

#### Flow

</summary>

Defined in `em` rather than `rem`, so they scale with local text. No primitive maps to them: a one-to-one rename earns no layer.

{{ bars(['--flow-space-2xs', '--flow-space-xs', '--flow-space-s', '--flow-space-m', '--flow-space-xl']) }}

</details>

---

## Applied

Source: `document/tokens.css`. Shorthands and component defaults sitting one tier above the semantic roles.

<details>
<summary>

#### Colour shorthands

</summary>

{% tableBlock true %}

| Token | Swatch | Description |
| --- | --- | --- |
| `--bg` | {{ chip('--bg') }} | Shorthand for the page background. |
| `--bg-alt` | {{ chip('--bg-alt') }} | Shorthand for the subtle background. |
| `--border` | {{ chip('--border') }} | Shorthand for the subtle border. |
| `--border-strong` | {{ chip('--border-strong') }} | Shorthand for the full border. |
| `--color-success` | {{ chip('--color-success') }} | Success at solid strength. |
| `--color-warning` | {{ chip('--color-warning') }} | Warning at surface strength, which reads better than the solid. |
| `--color-danger` | {{ chip('--color-danger') }} | Error at solid-hover strength. The danger alert border. |

{% endtableBlock %}

</details>

<details>
<summary>

#### Type

</summary>

{{ sample(['--text-lineheight-body', '--text-lineheight-footer'], 'line-height', 'Baseline sets the table, and this line wraps so the leading is visible rather than theoretical.', 'max-width: 34ch') }}

</details>

<details>
<summary>

#### Flow and wrapper

</summary>

`--flow-space` is the live gap between siblings inside `.u-flow`, with `--flow-space-snug` for tighter blocks and `--flow-space-heading` above headings.

{{ bars(['--flow-space', '--flow-space-snug', '--flow-space-heading', '--wrapper-max-width', '--wrapper-padding-inline']) }}

</details>

<script>
	// Fills each token readout with the value the browser resolved, so the page
	// reports the live cascade rather than what the token files say.
	(function () {
		const styles = getComputedStyle(document.documentElement);
		const read = (token) => styles.getPropertyValue(token).trim() || 'unset';

		document.querySelectorAll('.sg-value[data-token]').forEach((el) => {
			el.textContent = read(el.dataset.token);
		});

		document.querySelectorAll('.sg-chip[data-token]').forEach((el) => {
			el.title = el.dataset.token + ': ' + read(el.dataset.token);
		});
	})();
</script>
