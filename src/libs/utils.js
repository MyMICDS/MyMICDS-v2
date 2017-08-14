'use strict';

/**
 * @file General functions used throughout the project
 * @module utils
 */
const _ = require('underscore');

/**
 * Returns a number with possible leading zero if under 10
 * @function leadingZeros
 * @param {Number} n - number
 * @returns {Number|String}
 */

function leadingZeros(n) {
	if (n < 10) {
		return '0' + n;
	} else {
		return n;
	}
}

/**
 * Interpolate object values into a string
 * @param {String} string - String to interpolate
 * @param {Object} data - Data to use in interpolation (value replaces the {{key}})
 * @returns {String}
 */

function interpolateWithObject(string, data) {
	// F U N C T I O N A L
	return Object.keys(data).reduce((str, key) => str.replace(`{{${key}}}`, data[key]), string);
}

/**
 * Tests whether string is valid filename to prevent users from accessing/deleting files outside a specified directory (Ex. '../../some/other/directory')
 * @function validUsername
 * @returns {Boolean}
 */

function validFilename(username) {
	const nonoChars = [
		'..',
		'/',
		'\\'
	];
	return !_.contains(nonoChars, username);
}

module.exports.leadingZeros = leadingZeros;
module.exports.interpolateWithObject = interpolateWithObject;
module.exports.validFilename = validFilename;
