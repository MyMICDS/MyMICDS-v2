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
 * @param {getEventObjCallback} callback - Callback after events are retrieved
 */

/**
 * Callback after events are retrieved
 * @callback getEventObjCallback
 *
 * @param {Boolean} error - True if error in getting feed, false if not
 * @param {string} message - Description of error or success
 * @param {Object} events - Object containing feed 
 */

function getEventObject(url, callback) {
	if(url.includes("https://micds.instructure.com/feeds/calendars")) {
		request(url, function(reqError, response, body){
			if(!reqError) {
				var error = false;
				var message = "Successfully retrieved Canvas feed!";
				var events = ical.parseICS(body);
			} else {
				var error = true;
				var message = "Error retrieving Canvas feed!";
				var events = {};
			}
			if(typeof callback === 'function') callback(error, message, events);
		});
	} else {
		if(typeof callback === 'function') callback(true, "Invalid Canvas calendar URL!", {});
	}
}