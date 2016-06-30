'use strict';

/**
 * @file Reads Canvas calendar and retrieves events to integrate in our planner
 * @module canvas
 */

var _           = require('underscore');
var ical        = require('ical');
var request     = require('request');
var url         = require('url');
var users       = require(__dirname + '/users.js');

// URL Calendars come from
var urlPrefix = 'https://micds.instructure.com/feeds/calendars/';
// RegEx to test if calendar summary is a valid Day Rotation
var validDayRotation = /^Day [1-6] \((US|MS)\)$/;
var validDayRotationPlain = /^Day [1-6]$/;

/**
 * Makes sure a given url is valid and it points to a Canvas calendar feed
 * @function verifyURL
 *
 * @param {string} canvasURL - URI to iCal feed
 * @param {verifyURLCallback} callback - Callback
 */

/**
 * Returns whether url is valid or not
 * @callback verifyURLCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean|string} isValid - True if valid URL, string describing problem if not valid. Null if error.
 * @param {string} url - Valid and formatted URL to our likings. Null if error or invalid url.
 */

function verifyURL(canvasURL, callback) {

    if(typeof callback !== 'function') return;

    if(typeof canvasURL !== 'string') {
        callback(new Error('Invalid URL!'), null, null);
        return;
    }

    // Parse URL first
    var parsedURL = url.parse(canvasURL);

    // Check if pathname is valid
    if(!parsedURL.pathname.startsWith('/feeds/calendars/')) {
        // Not a valid URL!
        callback(null, 'Invalid URL path!', null);
        return;
    }

    var pathParts = parsedURL.path.split('/');
    var userCalendar = pathParts[pathParts.length - 1];

    var validURL = urlPrefix + userCalendar;

    // Not lets see if we can actually get any data from here
    request(validURL, function(err, response, body) {
        if(err) {
            callback(new Error('There was a problem fetching calendar data from the URL!'), null, null);
            return;
        }



        if(response.statusCode !== 200) {
            callback(null, 'Invalid URL!', null);
            return;
        }

        callback(null, true, validURL);

    });
}

/**
 * Sets a user's calendar URL if valid
 * @function setUrl
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} url - Calendar url
 * @param {setUrlCallback} callback - Callback
 */

 /**
  * Returns the valid url that was inserted into database
  * @callback setUrlCallback
  *
  * @param {Object} err - Null if success, error object if failure
  * @param {Boolean|string} isValid - True if valid URL, string describing problem if not valid. Null if error.
  * @param {string} validURL - Valid url that was inserted into database. Null if error or url invalid.
  */

function setURL(db, user, url, callback) {
    if(typeof callback !== 'function') {
        callback = function() {};
    }

    if(typeof db !== 'object') {
        callback(new Error('Invalid database connection!'), null, null);
        return;
    }

    users.getUser(db, user, function(err, isUser, userDoc) {
        if(err) {
            callback(err, null, null);
            return;
        }
        if(!isUser) {
            callback(new Error('User doesn\'t exist!'), null, null);
            return;
        }

        verifyURL(url, function(err, isValid, validURL) {
            if(err) {
                callback(err, null, null);
                return;
            } else if(isValid !== true) {
                callback(null, isValid, null);
                return;
            }

            var userdata = db.collection('users');

            userdata.update({ _id: userDoc['_id'] }, { $set: { canvasURL: validURL }}, { upsert: true }, function(err, result) {
                if(err) {
                    callback(new Error('There was a problem updating the URL to the database!'), null, null);
                    return;
                }

                callback(null, true, validURL);

            });
        });
    });
}

/**
 * Retrieves a user's calendar from a given month
 * @function getEvents
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username to get schedule
 * @param {Object} date - Object containing date to retrieve schedule. Leaving fields empty will default to today
 * @param {Number} [date.year] - What year to get schedule (Optional. Defaults to current year.)
 * @param {Number} [date.month] - Month number to get schedule. (1-12) (Optional. Defaults to current month.)
 * @param {getEventsCallback} callback - Callback
 */

 /**
  * Returns a user's schedule for that day
  * @callback getEventsCallback
  *
  * @param {Object} err - Null if success, error object if failure.
  * @param {Boolean} hasURL - Whether user has set a valid portal URL. Null if failure.
  * @param {Object} events - Array of all the events in the month. Null if failure.
  */

function getEvents(db, user, date, callback) {
    if(typeof callback !== 'function') return;
    if(typeof db !== 'object') { new Error('Invalid database connection!'); return; }

    // Default month and year to current date
	var current = new Date();

	if(typeof date.month !== 'number' || Number.isNaN(date.month) || date.month < 1 || 12 < date.month || date.month % 1 !== 0) {
		date.month = current.getMonth() + 1;
	}
	if(typeof date.year !== 'number' || Number.isNaN(date.month) || date.year % 1 !== 0) {
		date.year = current.getFullYear();
	}

    users.getUser(db, user, function(err, isUser, userDoc) {
        if(err) {
            callback(err, null, null);
            return;
        }
        if(!isUser) {
            callback(new Error('User doesn\'t exist!'), null, null);
            return;
        }

        if(typeof userDoc['canvasURL'] !== 'string') {
            callback(null, false, null);
            return;
        }

        request(userDoc['canvasURL'], function(err, response, body) {
            if(err) {
                callback(new Error('There was a problem fetching portal data from the URL!'), null, null);
                return;
            }
            if(response.statusCode !== 200) {
                callback(new Error('Invalid URL!'), null, null);
                return;
            }

            var data = ical.parseICS(body);

            // School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
            // Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
            if(_.isEmpty(data)) {
                callback(new Error('Invalid URL!'), null, null);
                return;
            }

            // Loop through all of the events in the calendar feed and push events within month to validEvents
            var validEvents = [];
            for(var eventUid in data) {
                var canvasEvent = data[eventUid];

                var start = new Date(canvasEvent['start']);
                var end   = new Date(canvasEvent['end']);

                var startMonth = start.getMonth() + 1;
				var startYear  = start.getFullYear();

				var endMonth = end.getMonth() + 1;
				var endYear  = end.getFullYear();

                var insertEvent = {
                    _id  : canvasEvent.uid,
                    user : userDoc['user'],
                    class: canvasEvent.class,
                    title: canvasEvent.summary,
                    start: start,
                    end  : end,
                    link : canvasEvent.url
                };

                if(typeof canvasEvent['ALT-DESC'] === 'object') {
                    insertEvent['desc'] = canvasEvent['ALT-DESC']['val'];
                } else {
                    insertEvent['desc'] = '';
                }

				if((startMonth === date.month && startYear === date.year) || (endMonth === date.month && endYear === date.year)) {
					// If event start or end is in month
					validEvents.push(insertEvent);
				} else if ((startMonth < date.month && startYear <= date.year) && (endMonth > date.month && endYear >= date.year)) {
					// If event spans before and after month
					validEvents.push(insertEvent);
				}
            }

            callback(null, true, validEvents);

        });
    });
}

module.exports.verifyURL = verifyURL;
module.exports.setURL    = setURL;
module.exports.getEvents = getEvents;
