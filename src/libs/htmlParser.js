'use strict';

/**
 * @file A bunch of utilities dealing with the parsing and manipulating of HTML strings
 * @module htmlParser
 */

var htmlparser = require('htmlparser2');

/**
 * Converts an HTML file to plaintext.
 * @function htmlToText
 * @param {string} html - HTML you want to convert to plaintext
 * @returns {string}
 */

function htmlToText(html) {
	var plaintext = '';

	var parser = new htmlparser.Parser({
		onopentag: (name, attribs) => {
			// Do nothing
		},
		ontext: text => {
			plaintext += text;
		},
		onclosetag: tagname => {
			// Do nothing
		}
	}, { decodeEntities: true });

	parser.parseComplete(html);
	return plaintext;
}

module.exports.htmlToText = htmlToText;
