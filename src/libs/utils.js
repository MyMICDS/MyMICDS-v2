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
	if(!Array.isArray(haystack)) {
		return false;
	}
	return haystack.indexOf(needle) > -1;
}

/**
 * Checks whether all values in array are not null
 * @function notNull
 * 
 * @param {Object} array - Array to be searched it
 * 
 * @returns {Boolean}
 */

function notNull(array) {
	return array.every(function(elem) {
		return elem !== null;
	});
}

/**
 * Checks the type of an object
 * @function objectTypeCheck
 * 
 * @param {Object} obj - Object to be type-checked
 * @param {string} typeTitle - Title of the object to check for
 * 
 * @returns {Boolean}
 */

function objectTypeCheck(obj, typeTitle) {
	var toClass = {}.toString;
	var objectType = toClass.call(obj);
	return objectType.replace("object ", "") === "[" + typeTitle + "]";
}

module.exports.dataIsSet 		= dataIsSet;
module.exports.inArray 			= inArray;
module.exports.notNull 			= notNull;
module.exports.objectTypeCheck 	= objectTypeCheck;