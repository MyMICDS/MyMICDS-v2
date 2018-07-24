import * as htmlparser from 'htmlparser2';

/**
 * Converts an HTML file to plaintext.
 * @function htmlToText
 * @param {string} html - HTML you want to convert to plaintext
 * @returns {string}
 */

export function htmlToText(html: string) {
	let plaintext = '';

	const parser = new htmlparser.Parser({
		onopentag() {
			// Do nothing
		},
		ontext(text) {
			plaintext += text;
		},
		onclosetag() {
			// Do nothing
		}
	}, { decodeEntities: true });

	parser.parseComplete(html);
	return plaintext;
}
