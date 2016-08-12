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
		onopentag: function(name, attribs) {
			// Do nothing
		},
		ontext: function(text) {
			plaintext += text;
		},
		onclosetag: function(tagname) {
			// Do nothing
		}
	}, { decodeEntities: true });

	parser.parseComplete(html);
	return plaintext;
}

module.exports.htmlToText = htmlToText;
