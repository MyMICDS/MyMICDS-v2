'use strict';

/**
 * @file A bunch of utilities dealing with the parsing and manipulating of HTML strings
 * @module htmlParser
 */
const htmlparser = require('htmlparser2');

/**
 * Converts an HTML file to plaintext.
 * @function htmlToText
 * @param {string} html - HTML you want to convert to plaintext
 * @returns {string}
 */

function htmlToText(html) {
	let plaintext = '';

	const parser = new htmlparser.Parser({
		onopentag: () => {
			// Do nothing
		},
		ontext: text => {
			plaintext += text;
		},
		onclosetag: () => {
			// Do nothing
		}
	}, {decodeEntities: true});

	parser.parseComplete(html);
	return plaintext;
}

module.exports.htmlToText = htmlToText;
