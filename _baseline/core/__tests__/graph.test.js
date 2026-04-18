import { describe, it, expect } from 'vitest';
import { createSiteGraph } from '../graph.js';

const sampleConfig = {
	dir: {
		input: 'src',
		output: 'dist',
		data: '_data',
		includes: '_includes',
		assets: 'assets'
	},
	htmlTemplateEngine: 'njk',
	markdownTemplateEngine: 'njk',
	templateFormats: ['html', 'njk', 'md']
};

describe('createSiteGraph', () => {
	it('returns an object with a config section matching the input', () => {
		const graph = createSiteGraph({ config: sampleConfig });
		expect(graph).toHaveProperty('config');
		expect(graph.config).toEqual(sampleConfig);
	});

	it('freezes the top-level config section', () => {
		const graph = createSiteGraph({ config: sampleConfig });
		expect(() => {
			graph.config.htmlTemplateEngine = 'liquid';
		}).toThrow();
	});

	it('freezes nested config properties', () => {
		const graph = createSiteGraph({ config: sampleConfig });
		expect(() => {
			graph.config.dir.output = 'build';
		}).toThrow();
	});

	it('insulates its copy from post-creation source mutation', () => {
		const source = structuredClone(sampleConfig);
		const graph = createSiteGraph({ config: source });
		source.dir.output = 'mutated';
		expect(graph.config.dir.output).toBe('dist');
	});
});
