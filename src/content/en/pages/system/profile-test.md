---
title: 'Profile test'
slug: 'profile-test'
description: 'Every design token the site defines: colour primitives, semantic roles, the type scale and the space scale.'
date: 2026-08-16
---

Flip the theme switcher to check both palettes, and resize the window to watch the fluid scales move.

<style>
	.sg-chip {
		display: block;
		width: 100%;
		min-width: 4rem;
		max-width: 4rem;
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
		font-family: monospace;
		word-break: break-all;
		color: var(--color-text-muted);
	}
	.sg-row {
		display: flex;
		align-items: baseline;
		gap: var(--space-s);
		padding-block: var(--space-2xs);
		border-block-end: 1px solid var(--color-border-subtle);
	}
	.sg-row__label {
		flex: 0 0 11rem;
		font-family: monospace;
		font-size: var(--text-size-muted);
		color: var(--color-text-muted);
	}
	.sg-bar {
		height: 1rem;
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

## Colour

### Primitives

{% set rungs = [
	['50', 'Lightest tint. Callout and alert backgrounds.'],
	['100', 'Tint. Subtle page and surface fills.'],
	['200', 'Tint. Surfaces and the lightest borders.'],
	['300', 'Light. Borders and hover surfaces.'],
	['400', 'Mid-light. Borders that need to be seen.'],
	['500', 'Peak chroma. The hue at full strength.'],
	['600', 'Mid-dark. Hover state for the solid.'],
	['700', 'Dark. Text on a light background.'],
	['800', 'Darker. Borders and surfaces in the dark theme.'],
	['900', 'Near-black. Dark theme surfaces, light theme text.'],
	['950', 'Darkest. Dark theme page background.']
] %}

<details>
<summary>

#### Black and white

</summary>

| Token | Swatch | Description |
| --- | --- | --- |
| `--color-black` | {{ chip('--color-black') }} | Pure black. No role maps to it. |
| `--color-white` | {{ chip('--color-white') }} | Pure white. Carries text on solid fills. |

</details>

{% set ramps = [
	['neutral', 'Neutral', 'Warm, hue 95. Surfaces and borders.'],
	['slate', 'Slate', 'Cool, hue 255. Text, and the dark theme surfaces.'],
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

| Token | Swatch | Description |
| --- | --- | --- |
{%- for rung in rungs %}
| `--color-{{ ramp[0] }}-{{ rung[0] }}` | {{ chip('--color-' + ramp[0] + '-' + rung[0]) }} | {{ rung[1] }} |
{%- endfor %}

</details>
{% endfor %}

### Semantics

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

| Token | Swatch | Description |
| --- | --- | --- |
{%- for role in roles %}
| `--{{ family[0] }}-{{ role[0] }}` | {{ chip('--' + family[0] + '-' + role[0]) }} | {{ role[1] }} |
{%- endfor %}

</details>
{% endfor %}

### Applied roles

<details>
<summary>

#### Shorthands and component defaults

</summary>


| Token | Swatch | Description |
| --- | --- | --- |
| `--bg` | {{ chip('--bg') }} | Shorthand for the page background. |
| `--bg-alt` | {{ chip('--bg-alt') }} | Shorthand for the subtle background. |
| `--border` | {{ chip('--border') }} | Shorthand for the subtle border. |
| `--border-strong` | {{ chip('--border-strong') }} | Shorthand for the full border. |
| `--color-success` | {{ chip('--color-success') }} | Success at solid strength. |
| `--color-warning` | {{ chip('--color-warning') }} | Warning at surface strength, which reads better than the solid. |
| `--color-danger` | {{ chip('--color-danger') }} | Error at solid-hover strength. The danger alert border. |
| `--table-border` | {{ chip('--table-border') }} | Table header and closing rules. |
| `--table-bg-odd` | {{ chip('--table-bg-odd') }} | The stripe on odd table rows. |
| `--table-bg-even` | {{ chip('--table-bg-even') }} | The stripe on even table rows. Transparent by default. |
| `--table-header-bg` | {{ chip('--table-header-bg') }} | Header row fill. Transparent by default. |

</details>

## Type

### Scale

<details>
<summary>

#### Eight steps

</summary>


{% for token in ['--step-rem--2', '--step-rem--1', '--step-rem-0', '--step-rem-1', '--step-rem-2', '--step-rem-3', '--step-rem-4', '--step-rem-5'] %}
<div class="sg-row">
	<div class="sg-row__label">{{ token }}<br><span class="sg-value" data-token="{{ token }}"></span></div>
	<div style="font-size: var({{ token }})">Baseline sets the table</div>
</div>
{%- endfor %}

</details>

### Roles

<details>
<summary>

#### Named roles

</summary>


{% for role in ['--text-size-muted', '--text-size-secondary', '--text-size-body', '--text-size-lede', '--text-size-title', '--text-size-display'] %}
<div class="sg-row">
	<div class="sg-row__label">{{ role }}<br><span class="sg-value" data-token="{{ role }}"></span></div>
	<div style="font-size: var({{ role }})">Baseline sets the table</div>
</div>
{%- endfor %}

</details>

<details>
<summary>

#### Weights and line heights

</summary>

<div class="sg-row"><div class="sg-row__label">--text-weight-regular</div><div style="font-weight: var(--text-weight-regular)">Regular, 400</div></div>
<div class="sg-row"><div class="sg-row__label">--text-weight-strong</div><div style="font-weight: var(--text-weight-strong)">Strong, 600</div></div>
<div class="sg-row"><div class="sg-row__label">--text-weight-heavy</div><div style="font-weight: var(--text-weight-heavy)">Heavy, 700</div></div>

<br>

Line heights are `--text-lineheight-tight` at 1.2, `--text-lineheight-default` at 1.5, and `--text-lineheight-loose` at 1.7. Letter spacing runs `--text-letter-tight` at -0.01em, `--text-letter-default` at 0, and `--text-letter-loose` at 0.01em.

</details>

## Space

### Scale

<details>
<summary>

#### Nine steps

</summary>


{% for token in ['--space-3xs', '--space-2xs', '--space-xs', '--space-s', '--space-m', '--space-l', '--space-xl', '--space-2xl', '--space-3xl'] %}
<div class="sg-row">
	<div class="sg-row__label">{{ token }}<br><span class="sg-value" data-token="{{ token }}"></span></div>
	<div class="sg-bar" style="width: var({{ token }})"></div>
</div>
{%- endfor %}

</details>

<details>
<summary>

#### Pairs

</summary>


{% for token in ['--space-3xs-2xs', '--space-2xs-xs', '--space-xs-s', '--space-s-m', '--space-m-l', '--space-l-xl', '--space-xl-2xl', '--space-2xl-3xl', '--space-s-l', '--space-s-xl', '--space-s-2xl'] %}
<div class="sg-row">
	<div class="sg-row__label">{{ token }}<br><span class="sg-value" data-token="{{ token }}"></span></div>
	<div class="sg-bar" style="width: var({{ token }})"></div>
</div>
{%- endfor %}

</details>

### Roles

<details>
<summary>

#### Spacing roles

</summary>

Five groups of names on top of the scale: `inset` for padding, `inline` for horizontal gaps, `stack` for vertical rhythm, `cluster` and `fluid` for the pairs. Components name these, not the raw steps.

{% for token in [
	'--space-inset-2xs', '--space-inset-xs', '--space-inset-s', '--space-inset-m', '--space-inset-l',
	'--space-inline-tight', '--space-inline-compact', '--space-inline-default', '--space-inline-comfortable',
	'--space-stack-3xs', '--space-stack-2xs', '--space-stack-xs', '--space-stack-s', '--space-stack-m', '--space-stack-l', '--space-stack-xl',
	'--space-cluster-s', '--space-cluster-m', '--space-cluster-l',
	'--space-fluid-s-l', '--space-fluid-s-xl', '--space-fluid-s-2xl'
] %}
<div class="sg-row">
	<div class="sg-row__label">{{ token }}<br><span class="sg-value" data-token="{{ token }}"></span></div>
	<div class="sg-bar" style="width: var({{ token }})"></div>
</div>
{%- endfor %}

</details>

<details>
<summary>

#### Flow and wrapper

</summary>

`--flow-space` is the gap between siblings inside `.u-flow`, and the wrapper values cap the measure.

{% for token in ['--flow-space', '--flow-space-snug', '--flow-space-heading', '--wrapper-max-width', '--wrapper-padding-inline'] %}
<div class="sg-row">
	<div class="sg-row__label">{{ token }}<br><span class="sg-value" data-token="{{ token }}"></span></div>
	<div class="sg-bar" style="width: min(var({{ token }}), 100%)"></div>
</div>
{%- endfor %}

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
