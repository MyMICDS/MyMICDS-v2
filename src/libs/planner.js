/**
 * @file Functions for dealing with planner data
 * @module planner
 */


var config = require(__dirname + '/config.js');

var classes     = require(__dirname + '/classes.js');
var users 		= require(__dirname + '/users.js');
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
 * @param {Object} id - ID of event that was upserted. Null if error.
 */

function upsertEvent(user, plannerEvent, callback, id) {

	// Validate inputs
	if(typeof callback !== 'function') callback = function() {};

	if(typeof user         !== 'string') { callback(new Error('Invalid user!'), null);         return; }
	if(typeof plannerEvent !== 'object') { callback(new Error('Invalid event object!'), null); return; }

	plannerEvent.id = plannerEvent.id || '';
	if(typeof plannerEvent.id    !== 'string') { callback(new Error('Invalid event id!')), null;    return; }
	if(typeof plannerEvent.title !== 'string') { callback(new Error('Invalid event title!'), null); return; }

	plannerEvent.desc = plannerEvent.desc || '';
	if(typeof plannerEvent.desc    !== 'string') { callback(new Error('Invalid event description!'), null); return; }
	if(typeof plannerEvent.classId !== 'string') { callback(new Error('Invalid event class id!'), null);    return; }
	if(typeof plannerEvent.start   !== 'object') { callback(new Error('Invalid event start!'), null);       return; }
	if(typeof plannerEvent.end     !== 'object') { callback(new Error('Invalid event end!'), null);         return; }

	plannerEvent.link = plannerEvent.link || '';
	if(typeof plannerEvent.link !== 'string' ) { callback(new Error('Invalid event link!'), null); return; }

	// Made sure start time and end time are consecutive or the same
	if(plannerEvent.start.getTime() > event.end.getTime()) {
		callback(new Error('Start and end time are not consecutive!'), null);
		return;
	}

	users.getUser(user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			db.close();
			callback(new Error('Invalid username!'), null);
			return;
		}

		classes.getClass(user, plannerEvent.classId, function(err, hasClass, classDoc) {
			if(err) {
				callback(err);
				return;
			}
			if(!hasClass) {
				callback(new Error('Invalid class id!'), null);
				return;
			}

			// Connect to database to upsert event
			MongoClient.connect(config.mongodbURI, function(err, db) {
				if(err) {
					callback(new Error('There was a problem connecting to the database!'), null);
					return;
				}

				var plannerdata = db.collection('planner');

				var validEditId = false;
				if(plannerEvent.id === '') {
					// Just insert event if no id is provided
					insertEvent();
				} else {
					// Check if edit id is valid
					plannerdata.find({ user: userDoc['_id'] }).toArray(function(err, events) {
						if(err) {
							db.close();
							callback(new Error('There was a problem querying the database!'), null);
							return;
						}

						// Look through all events if id is valid
						for(var i = 0; i < events.length; i++) {
							var eventId = events[i]['_id'];
							if(plannerEvent.id === eventId.toHexString()) {
								validEditId = eventId;
								break;
							}
						}
						insertEvent();
					});
				}

				// Just skip to function if no edit id is provided
				function insertEvent() {

					// Generate an Object ID, or use the id that we are editting
                    if(validEditId) {
                        var id = validEditId;
                    } else {
                        var id = new ObjectID();
                    }

					var insertEvent = {
						user : userDoc['_id'],
						class: classDoc['_id'],
						title: plannerEvent.title,
						desc : plannerEvent.desc,
						start: plannerEvent.start,
						end  : plannerEvent.end,
						link : plannerEvent.link
					}

					// Insert event into database
					plannerdata.update({ _id: id }, insertEvent, { upsert: true }, function(err, results) {
						db.close();
						if(err) {
							callback(new Error('There was a problem inserting the event into the database!'), null);
							return;
						}

						callback(null, id);

					});
				}
			});
		});
	});
}

/**
 * Deletes events from planner.
 * @function deleteEvent
 *
 * @param {string} user - Username of event to delete
 * @param {string} eventId - Id of event to delete
 * @param {deleteEventCallback} callback - Callback
 */

/**
 * Callback after planner data is deleted
 * @callback deleteEventCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function deleteEvent(user, eventId, callback) {

	if(typeof callback !== 'callback') {
		callback = function() {};
	}

	// Try to create object id
	try {
		var id = new ObjectID(eventId);
	} catch(e) {
		callback(new Error('Invalid event id!'));
		return;
	}

	// Make sure valid user and get user id
	users.getUser(user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('Invalid username!'));
			return;
		}

		// Connect to database
		MongoClient.connect(config.mongodbURI, function(err, db) {
			if(err) {
				callback(new Error('There was a problem connecting to the database!'));
				return;
			}

			var plannerdata = db.collection('planner');

			// Delete all events with specified id
			plannerdata.deleteMany({ _id: id, user: userDoc['_id'] }, function(err, results) {
				db.close();
				if(err) {
					callback(new Error('There was a problem deleting the event from the database!'));
					return;
				}

				callback(null);

			});
		});
	});
}

/**
 * Gets a list of all the events for the month
 * @function getMonthEvents
 *
 * @param {string} user - Username of events to get
 * @param {Object} date - Object containing month/year to get date. (Inputting an empty object will default to current date)
 * @param {Number} [month] - What month to get events. Starts at one. (1 - 12) (Optional, defaults to current month)
 * @param {Number} [year] - What year to get events in (Optional, defaults to current year)
 * @param {getMonthEventsCallback} callback - Callback
 */

/**
 * Callback after getting events
 * @callback getMonthEventsCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} events - Array of documents of events, with teacher documents injected. Null if error.
 */

function getMonthEvents(user, date, callback) {
	if(typeof callback !== 'function') return;

	if(typeof date !== 'object') {
		callback(new Error('Invalid date object!'), null);
		return;
	}
	// Default month and year to current date
	var current = new Date();
	if(date.month < 1 || 12 < date.month || date.month % 1 !== 0) {
		date.month = current.getMonth() + 1;
	}
	if(typeof date.year !== 'number' || date.year % 1 !== 0) {
		date.year = current.getFullYear();
	}

	users.getUser(user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		// Connect to database
		MongoClient.connect(config.mongodbURI, function(err, db) {
			if(err) {
				callback(new Error('There was a problem connecting to the database!'), null);
				return;
			}

			var plannerdata = db.collection('planner');
			// Get all events that belong to the user
			plannerdata.find({ user: userDoc['_id'] }).toArray(function(err, events) {
				db.close();
				if(err) {
					callback(new Error('There was a problem querying the database!'), null);
					return;
				}

				// Go through all events and add all events that are within the month
				var validEvents = [];
				for(var i = 0; i < events.length; i++) {
					var possibleEvent = events[i];

					var start = new Date(possibleEvent.start);
					var end   = new Date(possibleEvent.end);

					var startMonth = start.getMonth() + 1;
					var startYear  = start.getYear();

					if((startMonth === date.month && startYear === date.year) || (endMonth === date.month && endYear === date.year)) {
						// If event start or end is in month
						validEvents.push(possibleEvent);
					} else if ((startMonth < date.month && startYear <= date.year) && (endMonth > date.month && endYear >= date.year)) {
						// If event spans before and after month
						validEvents.push(possibleEvent);
					}
				}

				// Go through all events and set user to actual username, and teacher to actual teacher

				// Save teachers in object so we don't have to query database more than we need to
				var teachers = {};

				function injectValues(i) {
					if(i < validEvents.length) {
						var validEvent = validEvents[i];

						// Set user to actual username
						validEvent['user'] = userDoc['user'];

						// Set teacher to actual teacher
						var teacherId = validEvent['teacher'];

						if(typeof teachers[teacherId] === 'undefined') {
							teachers.getTeacher(teacherId, function(err, teacherDoc) {
								if(err) {
									callback(err, null);
									return;
								}

								teachers[teacherId] = teacherDoc;
								validEvent['teacher'] = teachers[teacherId];
								injectValues(i++);
							});
						} else {
							validEvent['teacher'] = teachers[teacherId];
							injectValues(i++);
						}

					} else {
						// Done through all events
						callback(null, validEvents);

					}
				}
				injectValues(0);
			});
		});
	});
}

module.exports.upsertEvent = upsertEvent;
module.exports.deleteEvent = deleteEvent;
module.exports.getMonthEvents = getMonthEvents;
