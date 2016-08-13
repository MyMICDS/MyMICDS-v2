'use strict';

/**
 * @file Functions for dealing with planner data
 * @module planner
 */

var _          = require('underscore');
var asyncLib   = require('async');
var canvas     = require(__dirname + '/canvas.js');
var classes    = require(__dirname + '/classes.js');
var htmlParser = require(__dirname + '/htmlParser.js');
var ObjectID   = require('mongodb').ObjectID;
var users 	   = require(__dirname + '/users.js');

/**
 * Add/edit event to planner
 * @function upsertEvent
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username to insert event under
 * @param {Object} plannerEvent - Event object
 * @param {string} [plannerEvent.id] - Optional id to edit event under
 * @param {string} plannerEvent.title - Main summary/label of the event
 * @param {string} [plannerEvent.desc] - Event description with details (Optional)
 * @param {string} [plannerEvent.classId] - Object ID of associated class (Optional)
 * @param {Object} plannerEvent.start - Javascript date object when event starts
 * @param {Object} plannerEvent.end - Javascript date object when event ends
 * @param {string} [plannerEvent.link] - Link to canvas assignment (Optional)
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

function upsertEvent(db, user, plannerEvent, callback) {

	// Validate inputs
	if(typeof callback !== 'function') callback = function() {};

	if(typeof db   !== 'object') { callback(new Error('Invalid database connection!'), null); return; }
	if(typeof user !== 'string') { callback(new Error('Invalid user!'),                null); return; }

	if(typeof plannerEvent         !== 'object') { callback(new Error('Invalid event object!'), null); return; }
	if(typeof plannerEvent.id      !== 'string') plannerEvent.id = '';
	if(typeof plannerEvent.title   !== 'string') { callback(new Error('Invalid event title!'), null); return; }
	if(typeof plannerEvent.desc    !== 'string') plannerEvent.desc = '';
	if(typeof plannerEvent.classId !== 'string') { plannerEvent.classId = null; }
	if(typeof plannerEvent.start   !== 'object') { callback(new Error('Invalid event start!'), null);       return; }
	if(typeof plannerEvent.end     !== 'object') { callback(new Error('Invalid event end!'), null);         return; }
	if(typeof plannerEvent.link    !== 'string') plannerEvent.link = '';

	// Made sure start time and end time are consecutive or the same
	if(plannerEvent.start.getTime() > plannerEvent.end.getTime()) {
		callback(new Error('Start and end time are not consecutive!'), null);
		return;
	}

	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('Invalid username!'), null);
			return;
		}

		classes.get(db, user, function(err, classes) {
			if(err) {
				callback(err);
				return;
			}

			// Check if class id is valid if it isn't null already
			var validClassId = null;
			if(plannerEvent.classId !== null) {
				for(var i = 0; i < classes.length; i++) {
					var classId = classes[i]['_id'];
					if(plannerEvent.classId === classId.toHexString()) {
						validClassId = classId;
						break;
					}
				}
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
					class: validClassId,
					title: plannerEvent.title,
					desc : plannerEvent.desc,
					start: plannerEvent.start,
					end  : plannerEvent.end,
					link : plannerEvent.link
				}

				// Insert event into database
				plannerdata.update({ _id: id }, insertEvent, { upsert: true }, function(err, results) {
					if(err) {
						callback(new Error('There was a problem inserting the event into the database!'), null);
						return;
					}

					callback(null, id);

				});
			}
		});
	});
}

/**
 * Deletes events from planner.
 * @function deleteEvent
 *
 * @param {Object} db - Database connection
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

function deleteEvent(db, user, eventId, callback) {

	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	// Try to create object id
	try {
		var id = new ObjectID(eventId);
	} catch(e) {
		callback(new Error('Invalid event id!'));
		return;
	}

	// Make sure valid user and get user id
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('Invalid username!'));
			return;
		}

		var plannerdata = db.collection('planner');

		// Delete all events with specified id
		plannerdata.deleteMany({ _id: id, user: userDoc['_id'] }, function(err, results) {
			if(err) {
				callback(new Error('There was a problem deleting the event from the database!'));
				return;
			}

			callback(null);

		});
	});
}

/**
 * Gets a list of all the events for the month (also gets events for previous month and next month)
 * @function getMonthEvents
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username of events to get
 * @param {Object} date - Object containing month/year to get date. (Inputting an empty object will default to current date)
 * @param {Number} [date.year] - What year to get events in (Optional, defaults to current year)
 * @param {Number} [date.month] - What month to get events. Starts at one. (1 - 12) (Optional, defaults to current month)
 * @param {Boolean} includeCanvas - Whether or not we should also query canvas add include Canvas events
 * @param {getMonthEventsCallback} callback - Callback
 */

/**
 * Callback after getting events
 * @callback getMonthEventsCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} events - Array of documents of events, with teacher documents injected. Null if error.
 */

function getMonthEvents(db, user, date, includeCanvas, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(typeof date !== 'object') {
		callback(new Error('Invalid date object!'), null);
		return;
	}
	if(typeof includeCanvas !== 'boolean') {
		includeCanvas = true;
	}
	// Default month and year to current date
	var current = new Date();

	if(typeof date.month !== 'number' || Number.isNaN(date.month) || date.month < 1 || 12 < date.month || date.month % 1 !== 0) {
		date.month = current.getMonth() + 1;
	}
	if(typeof date.year !== 'number' || Number.isNaN(date.month) || date.year % 1 !== 0) {
		date.year = current.getFullYear();
	}

	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		// Query planner data AND Canvas data at the same time
		asyncLib.parallel([
			function(callback) {
				var plannerdata = db.collection('planner');
				// Get all events that belong to the user
				plannerdata.find({ user: userDoc['_id'] }).toArray(function(err, events) {
					if(err) {
						callback(new Error('There was a problem querying the database!'), null);
						return;
					}

					// Go through all events and add all events that are within the month
					var validEvents = [];
					var addedEventIds = [];
					for(var i = 0; i < events.length; i++) {
						var possibleEvent = events[i];

						var start = possibleEvent.start;
						var end   = possibleEvent.end;

						var startYear  = start.getFullYear();
						var endYear  = end.getFullYear();

						// How many months forward and backward to also include events
						var monthPadding = 1;

						// Check previous and next months too
						for(var j = monthPadding * -1; j <= monthPadding; j++) {
							// Check if event was already added
							if(_.contains(addedEventIds, possibleEvent._id)) break;

							var startMonth = start.getMonth() + 1 + j;
							var endMonth = end.getMonth() + 1 + j;

							if((startMonth === date.month && startYear === date.year) || (endMonth === date.month && endYear === date.year)) {
								// If event start or end is in month
								possibleEvent.descPlaintext = htmlParser.htmlToText(possibleEvent.desc);
								validEvents.push(possibleEvent);
								addedEventIds.push(possibleEvent._id);

							} else if ((startMonth < date.month && startYear <= date.year) && (endMonth > date.month && endYear >= date.year)) {
								// If event spans before and after month
								possibleEvent.descPlaintext = htmlParser.htmlToText(possibleEvent.desc);
								validEvents.push(possibleEvent);
								addedEventIds.push(possibleEvent._id);

							}
						}
					}

					// Insert classes in place of class id's
					classes.get(db, user, function(err, classes) {
						if(err) {
							callback(err, null);
							return;
						}

						// Go through each event
						for(var i = 0; i < validEvents.length; i++) {
							// Set user to username
							validEvents[i]['user'] = userDoc['user'];
							// Default class to null
							var classId = validEvents[i]['class'];
							validEvents[i]['class'] = null;
							// Go through each class to search for matching id
							if(classId !== null) {
								var classIdHex = classId.toHexString();
								for(var j = 0; j < classes.length; j++) {
									if(classIdHex === classes[j]['_id'].toHexString()) {
										validEvents[i]['class'] = classes[j];
										break;
									}
								}
							}
						}

						callback(null, validEvents);

					});

				});
			},
			function(callback) {
				if(!includeCanvas) {
					callback(null, []);
					return;
				}

				canvas.getEvents(db, userDoc['user'], date, function(err, hasURL, events) {
					if(!hasURL) {
						callback(null, []);
						return;
					}
					if(err) {
						callback(null, err);
						return;
					}

					callback(null, events);

				});
			}
		],
		// After both Canvas query and planner query have compelted
		function(err, results) {
			if(err) {
				callback(err, null);
				return;
			}
			// Combine both arrays into final events array
			var combinedEvents = results[0].concat(results[1]);

			callback(null, combinedEvents);

		});
	});
}

module.exports.upsertEvent    = upsertEvent;
module.exports.deleteEvent    = deleteEvent;
module.exports.getMonthEvents = getMonthEvents;
