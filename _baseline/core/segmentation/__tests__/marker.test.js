import { describe, it, expect } from 'vitest';
import { segment } from '../marker.js';

const bodies = (parts) => parts?.map((part) => part.body);

describe('segment', () => {
	it('leaves a page with no marker alone', () => {
		expect(segment('Just prose.\n')).toBeNull();
	});

	it('splits on a marker and trims the parts', () => {
		expect(bodies(segment('One.\n\n<!--pagebreak-->\n\nTwo.\n'))).toEqual(['One.', 'Two.']);
	});

	it('splits on several markers', () => {
		expect(segment('a\n\n<!--pagebreak-->\n\nb\n\n<!--pagebreak-->\n\nc\n')).toHaveLength(3);
	});

	// The shelters markdown-it gives for free. A marker classified as fence,
	// code_block or code_inline never surfaces as an html_block, so a page
	// documenting the marker is not split by its own example.
	it('ignores a marker inside a fenced block', () => {
		expect(segment('a\n\n```\n<!--pagebreak-->\n```\n\nb\n')).toBeNull();
	});

	it('ignores a marker indented into a code block', () => {
		expect(segment('a\n\n    <!--pagebreak-->\n\nb\n')).toBeNull();
	});

	it('ignores a marker in inline code', () => {
		expect(segment('Write `<!--pagebreak-->` to split.\n')).toBeNull();
	});

	it('ignores a marker that is not alone on its line', () => {
		expect(segment('Prose with <!--pagebreak--> mid-sentence.\n')).toBeNull();
	});

	// `{% raw %}` is not a shelter and cannot be: a preprocessor runs before
	// Nunjucks, so at this point it is ordinary text markdown-it knows nothing
	// about. Recorded as behaviour rather than wished away.
	it('splits on a marker inside a raw block', () => {
		expect(segment('a\n\n{% raw %}\n<!--pagebreak-->\n{% endraw %}\n\nb\n')).toHaveLength(2);
	});

	it('returns null when a marker leaves only one body', () => {
		expect(segment('<!--pagebreak-->\n\nOnly one.\n')).toBeNull();
	});
});

// Nothing precedes part one, so a marker above the content is the only thing
// that can name it. Without this a named strip reads "1, Pizze, Primi": one
// number among three names, which is what both of Baseline's own consumers
// worked around in their layouts.
describe('a marker above the content', () => {
	const source = '<!--pagebreak|Antipasti-->\n\nOne.\n\n<!--pagebreak|Pizze-->\n\nTwo.\n';

	it('names part one', () => {
		expect(segment(source)[0].lead).toEqual({ anchor: undefined, label: 'Antipasti' });
	});

	// The cut is ignored because there is nothing above it to cut off. If it ever
	// produced a part, every URL on every split page would shift by one.
	it('does not add a part', () => {
		expect(bodies(segment(source))).toEqual(['One.', 'Two.']);
	});

	it('carries an anchor as well as a label', () => {
		const parts = segment('<!--pagebreak#top|Antipasti-->\n\nOne.\n\n<!--pagebreak-->\n\nTwo.\n');

		expect(parts[0].lead).toEqual({ anchor: 'top', label: 'Antipasti' });
	});

	it('leaves part one unnamed when nothing precedes it', () => {
		expect(segment('One.\n\n<!--pagebreak|Pizze-->\n\nTwo.\n')[0].lead).toBeUndefined();
	});

	// A bare leading marker is the shape that was already being dropped, and it
	// has no name to give.
	it('ignores a bare one', () => {
		expect(segment('<!--pagebreak-->\n\nOne.\n\n<!--pagebreak-->\n\nTwo.\n')[0].lead).toBeUndefined();
	});

	it('still refuses a page that has only one body under it', () => {
		expect(segment('<!--pagebreak|Antipasti-->\n\nOnly one.\n')).toBeNull();
	});
});

// The grammar borrows the wikilinks one: `#` an anchor, `|` the link text. The
// parameters describe the link *into* the part that follows the marker, so they
// land on the part before it. The last part never carries one.
describe('segment parameters', () => {
	const first = (content) => segment(content)[0].next;

	it('carries nothing for a bare marker', () => {
		expect(first('a\n\n<!--pagebreak-->\n\nb\n')).toBeUndefined();
	});

	it('reads a label', () => {
		expect(first('a\n\n<!--pagebreak|Coming soon-->\n\nb\n')).toEqual({
			anchor: undefined,
			label: 'Coming soon'
		});
	});

	it('reads an anchor and a label together', () => {
		expect(first('a\n\n<!--pagebreak#notes|Read on-->\n\nb\n')).toEqual({
			anchor: 'notes',
			label: 'Read on'
		});
	});

	it('reads an anchor on its own', () => {
		expect(first('a\n\n<!--pagebreak#notes-->\n\nb\n')).toEqual({
			anchor: 'notes',
			label: undefined
		});
	});

	it('tolerates spacing around the marker and its parameters', () => {
		expect(first('a\n\n<!--  pagebreak#notes | Read on  -->\n\nb\n')).toEqual({
			anchor: 'notes',
			label: 'Read on'
		});
	});

	it('attaches parameters to the part before the marker, never the last', () => {
		const parts = segment('a\n\n<!--pagebreak|To two-->\n\nb\n\n<!--pagebreak|To three-->\n\nc\n');
		expect(parts.map((part) => part.next?.label)).toEqual(['To two', 'To three', undefined]);
	});
});
