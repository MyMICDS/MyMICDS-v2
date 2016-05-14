/**
 * @file Functions for dealing with planner data
 * @module planner
 */

var users 		= require(__dirname + "/users.js");
var utils 		= require(__dirname + "/utils.js");
var MongoClient = require('mongodb').MongoClient;
var ObjectId 	= require('mongodb').ObjectID;
var config     	= require(__dirname + '/requireConfig.js');

/**
 * Add/edit event to planner
 * @function upsertEvent
 *
 * @todo Add type validation
 * @param {string} user - Username to insert event under
 * @param {Object} event - Event object
 * @param {string} event.desc - Event description
 * @param {string} event.class - Class associated with event (obj id)
 * @param {Object} event.start - Start date of event, Date() object
 * @param {Object} event.end - End date of event, Date() object
 * @param {string} [event.link] - Link to canvas assignment (optional)
 * 
 * @param {upsertEventCallback} callback - Callback after planner data is upserted
 * @param {string} [id] - Event ID to update (optional)
 */

/**
 * Callback after planner data is upserted
 * @callback upsertEventCallback
 * @param {Boolean} success - True if successful, false if not
 * @param {string} message - Success/error message
 */

function upsertEvent(user, event, callback, id) {
	var required = [
		user,
		event.desc,
		event.class,
		event.start,
		event.end
	];
    callback = callback || function() {};
    
	if(utils.dataIsSet(required)) {
		MongoClient.connect(config.mongodbURI, function(dbErr, db) {
			if(!dbErr) {
				var plannerColl = db.collection("planner");
				users.getUserId(user, function(userId) {
					if(typeof userId !== 'boolean') {
						if(typeof id === 'undefined') {
							// no id to update from? that's fine, just insert
	 						var insertedEvent = {
								user: userId,
								description: event.desc,
								class: ObjectId(event.class),
								start: event.start,
								end: event.end
							};

							if(typeof event.link !== "undefined") {
								insertedEvent["link"] = event.link;
							}

							plannerColl.insert(insertedEvent, function(insertErr) {
								if(typeof insertErr !== null) {
									callback(true, "Successfully inserted event!");
								} else {
									callback(false, "Error inserting event!");
									console.log(insertErr);
								}
							});
							db.close();
						} else {
							// oh hey, there is an id! let's update it.
							var updatedEvent = {
								description: event.desc,
								class: ObjectId(event.class),
								start: event.start,
								end: event.end
							};

							if(typeof event.link !== "undefined") {
								updatedEvent["link"] = event.link;
							}

							plannerColl.update({user: userId, _id: ObjectId(id)}, {$set: updatedEvent}, function(updateErr) {
								if(typeof updateErr !== null) {
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
 * @todo Add type validation + user confirmation
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
				plannerColl.remove({_id: ObjectId(eventId)}, function(removeErr) {
					if(typeof removeErr !== null) {
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

/**
 * Gets a list of all the events for the month
 * @function eventsForMonth
 *
 * @todo Add type validation
 * @param {string} user - Username of events to get
 * @param {eventsMonthCallback} callback - Callback after getting events
 * @param {Number} month - What month to get events. Starts at zero. (0 - 11)
 * @param {Number} year - What year to get events in
 */

/**
 * Callback after getting events
 * @callback eventsMonthCallback
 * @param {Array} result - Array of obj id's for events in month, return empty array if error
 */

function eventsForMonth(user, callback, month, year) {
    var returnEvents = [];
    var current = new Date();
    
    callback = callback || function() {};
    month = parseInt(month);
    month = 0 <= month && month <= 11 ? month : current.getMonth();
    year = typeof year !== 'undefined' ? parseInt(year) : current.getFullYear();
    
    if(typeof user === 'string') {
        users.getUserId(user, function(userId) {
            if(userId) {
                MongoClient.connect(config.mongodbURI, function(dbErr, db) {
                    if(!dbErr) {
                        var plannerColl = db.collection("planner");
                        plannerColl.find({ user: userId }).toArray(function(findErr, events) {
                            if(!findErr) {
                                for(var i = 0; i < events.length; i++) {
                                    
                                    var event = events[i];
                                    
                                    var start = new Date(event.start);
                                    var end   = new Date(event.end);
                                    
                                    var startMonth = start.getMonth();
                                    var startYear  = start.getFullYear();
                                    
                                    var endMonth = end.getMonth();
                                    var endYear  = end.getFullYear();
                                    
                                    if((startMonth === month && startYear === year) || (endMonth === month && endYear === year)) {
                                        // If event start or end is in month
                                        returnEvents.push(event);
                                    } else if ((startMonth < month && startYear <= year) && (endMonth > month && endYear >= year)) {
                                        // If event spans before and after month
                                        returnEvents.push(event);
                                    }
                                }
                                callback(returnEvents);
                            } else {
                                callback(returnEvents);
                            }
                        });
                    } else {
                        callback(returnEvents);
                    }
                });
            } else {
                callback(returnEvents);
            }
        });
    } else {
        callback(returnEvents);
    }
}

module.exports.upsertEvent = upsertEvent;
module.exports.deleteEvent = deleteEvent;
module.exports.eventsForMonth = eventsForMonth;