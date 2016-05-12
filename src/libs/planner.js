/**
 * @file Functions for dealing with planner data
 * @module planner
 */

var users = require(__dirname + "/users.js");
var utils = require(__dirname + "/utils.js");
var MongoClient = require('mongodb').MongoClient;
var config      = require(__dirname + '/requireConfig.js');

/**
 * Add event to planner
 * @param {string} user - Username to insert event under
 * @param {Object} event - Event object
 * @param {string} event.desc - Event description
 * @param {string} event.class - Class associated with event (obj id)
 * @param {Object} event.start - Start date of event, Date() object
 * @param {Object} event.end - End date of event, Date() object
 * @param {string} [event.link] - Link to canvas assignment (optional)
 * @param {addEventCallback} callback - Callback after planner data is inserted
 */

/**
 * Callback after planner data is inserted
 * @callback addEventCallback
 * @param {Boolean} success - True if successful, false if not
 * @param {string} message - Success/error message
 */

function addEvent(user, event, callback) {
	var required = [
		user,
		event.desc,
		event.class,
		event.start,
		event.end
	];
	if(utils.dataIsSet(required)) {
		MongoClient.connect(config.mongodbURI, function(dbErr, db) {
			var plannerColl = db.collection("planner");
			if(!dbErr) {
				var userId = users.getUserId(user, function(id) {
					if(typeof id !== 'boolean') {
						if(dataIsSet)
						var insertedEvent = {
							user: id,
							description: event.desc,
							class: event.class,
							start: event.start,
							end: event.end
						};

						if(typeof event.link !== "undefined") {
							insertedEvent["link"] = event.link;
						}

						plannerColl.insert(insertedEvent, function(insertErr, result) {
							if(!insertErr) {
								callback(true, "Successfully inserted class!");
							} else {
								callback(false, "Error inserting class!");
							}
						});
					} else {
						callback(false, "Error retrieving user ID!");
					}
				});
			} else {
				// whoops, error!
				callback(false, "Error connecting to database!");
			}
		});
	} else {
		// look at that, another error.
		callback(false, "Not all required parameters exist!");
	}
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