/**
 * @file General functions used everywhere
 * @module utils
 */

/**
 * Makes sure all values are not null or undefined or empty strings
 * @function dataIsSet
 * 
 * @param {Object} array - Array to be searched in
 * 
 * @returns {Boolean}
 */

function dataIsSet(array) {
	return array.every(function(elem) {
		return typeof elem !== undefined && elem !== '';
	});
}

/**
 * Checks whether a certain value is in an array
 * @function inArray
 * 
 * @param needle - Value to be searched in array
 * @param {Object} haystack - Array to be searched in
 * 
 * @returns {Boolean}
 */

function inArray(needle, haystack) {
	return haystack.indexOf(needle) > -1;
}

module.exports.dataIsSet = dataIsSet;
module.exports.inArray   = inArray;