/**
 * IndexNow submitter.
 *
 * Announces this site's URLs to the IndexNow endpoint (Bing, Yandex, Seznam,
 * Naver). Google does not participate, so this is a machine-discovery surface
 * alongside llms.txt and the schema endpoints, not an SEO channel.
 *
 * Reads the URL list from the built sitemaps rather than walking dist/, so the
 * sitemap's exclusions carry through for free: /404.html, /navigator-core.html
 * and the /system/ index pages stay unannounced without a second rule.
 *
 * Run AFTER the deploy is live. The endpoint fetches the key file to verify
 * ownership, and submitting URLs that are not yet published achieves nothing.
 *
 * The key is not stored here. It is read from the key file in src/static/, so
 * rotating it means replacing that file and nothing else.
 *
 *   npm run indexnow            list what would be submitted, send nothing
 *   npm run indexnow -- --submit  actually submit
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const STATIC = 'src/static';
const HOST = 'www.eleventy-baseline.dev';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const submit = process.argv.includes('--submit');

/**
 * Find the IndexNow key by looking for its key file, rather than hardcoding it.
 *
 * A valid key file is named `<key>.txt` and contains exactly `<key>`, so the
 * filename and the contents validate each other. That test also excludes the
 * other .txt files living here (robots.txt), with no allow-list to maintain.
 *
 * Keeping the key in one place means rotating it is "delete a file, add a
 * file" with no code edit, and nothing generated anywhere else is baked in.
 *
 * @returns {string} The key.
 */
function findKey() {
	const candidates = readdirSync(STATIC)
		.filter((f) => /^[A-Za-z0-9-]{8,128}\.txt$/.test(f))
		.filter((f) => readFileSync(path.join(STATIC, f), 'utf8').trim() === path.basename(f, '.txt'));

	if (!candidates.length) {
		throw new Error(
			`No IndexNow key file in ${STATIC}/.\n` +
				`Generate a key (https://www.bing.com/indexnow/getstarted has a generator),\n` +
				`then save it as ${STATIC}/<key>.txt containing exactly that key.`
		);
	}
	if (candidates.length > 1) {
		throw new Error(`Multiple key files in ${STATIC}/: ${candidates.join(', ')}. Keep one.`);
	}
	return path.basename(candidates[0], '.txt');
}

/**
 * Collect every `<loc>` from the per-language sitemaps.
 *
 * The root sitemap.xml is an index pointing at /en/, /nl/ and /fr/, so it is
 * skipped: its locs are sitemaps, not pages.
 *
 * @returns {string[]} Absolute page URLs, deduped and sorted.
 */
function collectUrls() {
	const files = readdirSync(DIST, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => path.join(DIST, d.name, 'sitemap.xml'))
		.filter(existsSync);

	if (!files.length) throw new Error(`No per-language sitemaps under ${DIST}/. Run a build first.`);

	const urls = new Set();
	for (const file of files) {
		const xml = readFileSync(file, 'utf8');
		for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1].trim());
	}
	return [...urls].sort();
}

/**
 * Guard against announcing a localhost build. settings.js falls back to
 * localhost when URL is unset, and that mistake is silent everywhere else.
 *
 * @param {string[]} urls
 */
function assertProductionUrls(urls) {
	const wrong = urls.filter((u) => !u.startsWith(`https://${HOST}/`));
	if (wrong.length) {
		throw new Error(
			`${wrong.length} URL(s) are not on https://${HOST}/ — first is ${wrong[0]}.\n` +
				`Rebuild with URL=https://${HOST}/ before submitting.`
		);
	}
}

const KEY = findKey();
const urls = collectUrls();
assertProductionUrls(urls);

console.log(`${urls.length} URLs from ${DIST}/*/sitemap.xml`);
console.log(`key file: https://${HOST}/${KEY}.txt`);

if (!submit) {
	urls.forEach((u) => console.log('  ' + u));
	console.log('\nDry run. Re-run with --submit to announce.');
	process.exit(0);
}

const res = await fetch(ENDPOINT, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json; charset=utf-8' },
	body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls })
});

// 200 accepted, 202 accepted but key still being validated. Anything else is a
// real failure worth reading: 403 means the key file did not verify, 422 means
// the URLs do not match the host.
if (res.status === 200 || res.status === 202) {
	console.log(`\nSubmitted ${urls.length} URLs. ${res.status} ${res.statusText}`);
} else {
	console.error(`\nFailed: ${res.status} ${res.statusText}`);
	console.error(await res.text());
	process.exit(1);
}
