/**
 * @file Functions for dealing with planner data
 * @module planner
 */


var config = require(__dirname + '/config.js');

var users 		= require(__dirname + "/users.js");
var MongoClient = require('mongodb').MongoClient;
var ObjectId 	= require('mongodb').ObjectID;

/**
 * Add/edit event to planner
 * @function upsertEvent
 *
 * @param {string} user - Username to insert event under
 * @param {Object} plannerEvent - Event object
 * @param {string} [plannerEvent.id] - Optional id to edit event under
 * @param {string} plannerEvent.title - Main summary/label of the event
 * @param {string} [plannerEvent.desc] - Event description with details (optional)
 * @param {string} plannerEvent.classId - Object ID of associated class
 * @param {Object} plannerEvent.start - Javascript date object when event starts
 * @param {Object} plannerEvent.end - Javascript date object when event ends
 * @param {string} [plannerEvent.link] - Link to canvas assignment (optional)
 *
 * @param {upsertEventCallback} callback - Callback
 */

/**
 * Callback after planner data is upserted
 * @callback upsertEventCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function upsertEvent(user, plannerEvent, callback, id) {

	// Validate inputs
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof user !== 'string') {
		callback(new Error('Invalid user!'));
		return;
	}

	if(typeof plannerEvent !== 'object') {
		callback(new Error('Invalid event object!'));
		return;
	}

	plannerEvent.id = plannerEvent.id || '';
	if(typeof plannerEvent.id !== 'string') {
		callback(new Error('Invalid event id!'));
		return;
	}

	if(typeof plannerEvent.title !== 'string') {
		callback(new Error('Invalid event title!'));
		return;
	}

	plannerEvent.desc = plannerEvent.desc || '';
	if(typeof plannerEvent.desc !== 'string') {
		callback(new Error('Invalid event description!'));
		return;
	}

	if(typeof plannerEvent.classId !== 'string') {
		callback(new Error('Invalid event class id!'));
		return;
	}

	if(typeof plannerEvent.start !== 'object') {
		callback(new Error('Invalid event start!'));
		return;
	}

	if(typeof plannerEvent.end !== 'object') {
		callback(new Error('Invalid event end!'));
		return;
	}

	plannerEvent.link = plannerEvent.link || '';
	if(typeof plannerEvent.link !== 'string') {
		callback(new Error('Invalid event link!'));
		return;
	}

	// Made sure start time and end time are consecutive or the same
	if(plannerEvent.start.getTime() > event.end.getTime()) {
		callback(new Error('Start and end time are not consecutive!'));
		return;
	}

	// Connect to database to upsert event
	MongoClient.connect(config.mongodbURI, function(err, db) {

		if(err) {
			callback(new Error('There was a problem connecting to the database!'));
			return;
		}

		var plannerdata = db.collection('planner');

		users.getUser(user, function(err, isUser, data) {

			if(!isUser) {
				db.close();
				callback(new Error('Invalid username!'));
				return;
			}
			// TODO

				var classesColl = db.collection("classes");
				classesColl.find({_id: ObjectId(event.class)}).toArray(function(findErr, foundDocs){
					if(typeof findErr !== null) {
						if(foundDocs.length == 0) {
							if(typeof id === 'undefined') {
								// no id to update from? that's fine, just insert
		 						var insertedEvent = {
									user: userId,
									description: event.desc,
									scheduleClass: ObjectId(event.class),
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
							}
						} else {
							callback(false, "Invalid class ID!");
						}
					} else {
						callback(false, "Error checking class ID!");
					}
				});
			} else {
				callback(false, "Error retrieving user ID!");
			}
		});
	});
}

/**
 * Deletes events from planner.
 * @function deleteEvent
 *
 * @param {string} eventId - ID of event to delete.
 * @param {string} user - Username to confirm deletion of event.
 * @param {deleteEventCallback} callback - Callback after planner data is deleted
 */

/**
 * Callback after planner data is deleted
 * @callback deleteEventCallback
 * @param {Boolean} success - True if successful, false if not
 * @param {string} message - Error/success message
 */
function deleteEvent(eventId, user, callback) {
	callback = callback || function() {};
	if(typeof eventId !== "undefined" || typeof user !== "undefined") {
		MongoClient.connect(config.mongodbURI, function(dbErr, db) {
			if(!dbErr) {
				var plannerColl = db.collection("planner");
				users.getUserId(user, function(userId) {
					if(typeof userId === "string") {
						plannerColl.find({_id: ObjectId(eventId), user: ObjectId(userId)}).toArray(function(findErr, foundDocs) {
							if(typeof findErr !== null) {
								if(foundDocs.length == 0) {
									plannerColl.remove({_id: ObjectId(eventId)}, function(removeErr) {
										if(typeof removeErr !== null) {
											callback(true, "Successfully removed event!");
										} else {
											callback(false, "Error removing event!");
										}
									});
								} else {
									callback(false, "Invalid event ID under specified user!");
								}
							} else {
								callback(false, "Error finding event ID under specified user!");
							}
						});
					} else {
						callback(false, "Error getting user ID!");
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
