import { describe, it, expect } from 'vitest';
import { configSchema } from '../schema.js';
import { config } from '../../eleventy.config.js';

describe('configSchema', () => {
	it('parses the real exported config cleanly', () => {
		const result = configSchema.safeParse(config);
		expect(result.success).toBe(true);
	});

	it('rejects a config missing dir.input', () => {
		const input = structuredClone(config);
		delete input.dir.input;
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['dir', 'input']);
	});

	it('rejects an empty string in dir.assets', () => {
		const input = structuredClone(config);
		input.dir.assets = '';
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['dir', 'assets']);
	});

	it('rejects a missing templateFormats', () => {
		const input = structuredClone(config);
		delete input.templateFormats;
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['templateFormats']);
	});

	it('rejects an empty templateFormats array', () => {
		const input = structuredClone(config);
		input.templateFormats = [];
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['templateFormats']);
	});

	it('rejects templateFormats without njk (the refine)', () => {
		const input = structuredClone(config);
		input.templateFormats = ['html', 'md'];
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].code).toBe('custom');
		expect(result.error.issues[0].path).toEqual(['templateFormats']);
	});
});
