'use strict';

/**
 * @file General functions used throughout the project
 * @module utils
 */

var _ = require('underscore');

 /**
  * Returns a number with possible leading zero if under 10
  * @function leadingZeros
  * @param {Number} n - number
  * @returns {Number|String}
  */

 function leadingZeros(n) {
 	if(n < 10) {
 		return '0' + n;
 	} else {
 		return n;
 	}
 }

/**
 * Tests whether string is valid filename to prevent users from accessing/deleting files outside a specified directory (Ex. '../../some/other/directory')
 * @function validUsername
 * @returns {Boolean}
 */

function validFilename(username) {
	var nonoChars = [
		'..',
		'/',
		'\\'
	];
	return !_.contains(nonoChars, username);
}

module.exports.leadingZeros  = leadingZeros;
module.exports.validFilename = validFilename;
