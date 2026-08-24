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
