import * as htmlparser from 'htmlparser2';

/**
 * Strips an HTML string into plaintext.
 * @param html Input HTML string to convert.
 */
export function htmlToText(html: string) {
	let plaintext = '';

	const parser = new htmlparser.Parser(
		{
			onopentag() {
				// Do nothing
			},
			ontext(text) {
				plaintext += text;
			},
			onclosetag() {
				// Do nothing
			}
		},
		{ decodeEntities: true }
	);

	parser.parseComplete(html);
	return plaintext;
}
