/**
 * @file Functions for dealing with planner data
 * @module planner
 */

var users = require(__dirname + "/users.js");
var MongoClient = require('mongodb').MongoClient;


/**
 * Add event to planner
 * @param {String} user - Username to insert event under
 * @param {Object} event - Event object
 * @param {String} event.desc - Event description
 * @param {String} event.class - Class associated with event
 * @param {String} event.start - Start date of event
 * @param {String} event.end - End date of event
 * @param {addEventCallback} callback - Callback after planner data is inserted
 */

/**
 * Callback after planner data is inserted
 * @callback addEventCallback
 * @param {Boolean} success - True if successful, false if not
 */

function addEvent(user, event, callback) {
	// stuff goes here at some point
}

function editEvent() {
	// and more stuff
}

function deleteEvent() {
	// yet more things
}

module.exports.addEvent = addEvent;
module.exports.editEvent = editEvent;
module.exports.deleteEvent = deleteEvent;