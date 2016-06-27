/**
 * @file Reads calendar feed to determine events and such from Canvas
 * @module canvas
 */

var request = require("request");
var ical 	= require("ical");

/**
 * Obtains object with events in it, given a Canvas URL
 * @function getEventObject
 *
 * @param {string} url - URL to Canvas iCal feed
 * @param {getEventObjCallback} callback - Callback
 */

/**
 * Callback after events are retrieved
 * @callback getEventObjCallback
 *
 * @param {Boolean} err - Null if success, error object if failure
 * @param {Object} events - Array containing feed. Null array if failure.
 */

function getEventObject(url, callback) {

	if(typeof callback !== 'function') return;

	if(typeof url !== 'string') {
		callback(new Error('Invalid url!'), null);
		return;
	}

	request(url, function(err, response, body){
		if(err) {
			callback(new Error('There was an error fetching the url!'), null);
			return;
		}

		/** @TODO: Parse the actual canvas thing */

	});
}
