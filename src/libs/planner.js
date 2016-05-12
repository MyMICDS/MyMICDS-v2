/**
 * @file Functions for dealing with planner data
 * @module planner
 */

var users 		= require(__dirname + "/users.js");
var utils 		= require(__dirname + "/utils.js");
var MongoClient = require('mongodb').MongoClient;
var config     	= require(__dirname + '/requireConfig.js');

/**
 * Add/edit event to planner
 * @function upsertEvent
 * 
 * @param {string} user - Username to insert event under
 * @param {Object} event - Event object
 * @param {string} event.desc - Event description
 * @param {string} event.class - Class associated with event (obj id)
 * @param {Object} event.start - Start date of event, Date() object
 * @param {Object} event.end - End date of event, Date() object
 * @param {string} [event.link] - Link to canvas assignment (optional)
 * @param {string} [id] - Event ID to update (optional)
 * 
 * @param {upsertEventCallback} callback - Callback after planner data is upserted
 */

/**
 * Callback after planner data is upserted
 * @callback upsertEventCallback
 * @param {Boolean} success - True if successful, false if not
 * @param {string} message - Success/error message
 */

function upsertEvent(user, event, id, callback) {
	var required = [
		user,
		event.desc,
		event.class,
		event.start,
		event.end
	];
	if(utils.dataIsSet(required)) {
		MongoClient.connect(config.mongodbURI, function(dbErr, db) {
			if(!dbErr) {
				var plannerColl = db.collection("planner");
				var userId = users.getUserId(user, function(userId) {
					if(typeof userId !== 'boolean') {
						if(typeof id === 'undefined') {
							// no id to update from? that's fine, just insert
	 						var insertedEvent = {
								user: userId,
								description: event.desc,
								class: event.class,
								start: event.start,
								end: event.end
							};

							if(typeof event.link !== "undefined") {
								insertedEvent["link"] = event.link;
							}

							plannerColl.insert(insertedEvent, function(insertErr) {
								if(!insertErr) {
									callback(true, "Successfully inserted event!");
								} else {
									callback(false, "Error inserting event!");
								}
							});
							db.close();
						} else {
							// oh hey, there is an id! let's update it.
							var updatedEvent = {
								description: event.desc,
								class: event.class,
								start: event.start,
								end: event.end
							};

							if(typeof event.link !== "undefined") {
								updatedEvent["link"] = event.link;
							}

							plannerColl.update({user: userId, _id: id}, {$set: updatedEvent}, function(updateErr) {
								if(!updateErr) {
									callback(true, "Successfully updated event!")
								} else {
									callback(false, "Error updating event!");
								}
							});
							db.close();
						}
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

/**
 * Deletes events from planner.
 * @function deleteEvent
 * 
 * @param {string} eventId - ID of event to delete.
 * @param {deleteEventCallback} callback - Callback after planner data is deleted
 */

/**
 * Callback after planner data is deleted
 * @callback deleteEventCallback
 * @param {Boolean} success - True if successful, false if not
 * @param {string} message - Error/success message
 */
function deleteEvent(eventId, callback) {
	if(typeof eventId !== "undefined") {
		MongoClient.connect(config.mongodbURI, function(dbErr, db) {
			if(!dbErr) {
				var plannerColl = db.collection("planner");
				plannerColl.remove({_id: eventId}, function(removeErr) {
					if(!removeErr) {
						callback(true, "Successfully removed event!");
					} else {
						callback(false, "Error removing event!");
					}
				});
				db.close();
			} else {
				callback(false, "Error connecting to database!");
			}
		});
	} else {
		callback(false, "Not all required parameters exist!");
	}
}

module.exports.upsertEvent = upsertEvent;
module.exports.deleteEvent = deleteEvent;