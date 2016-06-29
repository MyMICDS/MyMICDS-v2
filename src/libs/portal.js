/**
 * @file Reads calendar feed to determine schedule / day and other important events
 * @module portal
 */

var config = require(__dirname + '/config.js');

var _           = require('underscore');
var ical        = require('ical');
var MongoClient = require('mongodb').MongoClient;
var querystring = require('querystring');
var request     = require('request');
var url         = require('url');
var users       = require(__dirname + '/users.js');
var utils       = require(__dirname + '/utils.js');

// URL Calendars come from
var urlPrefix = 'https://micds.myschoolapp.com/podium/feed/iCal.aspx?q=';
// RegEx to test if calendar summary is a valid Day Rotation
var validDayRotation = /^Day [1-6] \((US|MS)\)$/;

/**
 * Makes sure a given url is valid and it points to a Canvas calendar feed
 * @function verifyURL
 *
 * @param {string} url - URI to iCal feed
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

function verifyURL(portalURL, callback) {

    if(typeof callback !== 'function') return;

    if(typeof portalURL !== 'string') {
        callback(new Error('Invalid URL!'), null, null);
        return;
    }

    // Parse URL first
    var parsedURL = url.parse(portalURL);
    var queries = querystring.parse(parsedURL.query);

    if(typeof queries.q !== 'string') {
        callback(null, 'URL does not contain calendar ID!', null);
        return;
    }

    var validURL = urlPrefix + queries.q;

    // Not lets see if we can actually get any data from here
    request(validURL, function(err, response, body) {
        if(err) {
            callback(new Error('There was a problem fetching portal data from the URL!'), null, null);
            return;
        }
        if(response.statusCode !== 200) {
            callback(null, 'Invalid URL!', null);
            return;
        }

        var data = ical.parseICS(body);

        // School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
        // Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
        if(_.isEmpty(data)) {
            callback(null, 'Invalid URL!', null);
            return;
        }

        // Look through every 'Day # (US/MS)' andd see how many events there are
        var dayDates = {};
        for(var eventUid in data) {
            var calEvent = data[eventUid];
            // If event doesn't have a summary, skip
            if(typeof calEvent.summary !== 'string') continue;

            // See if valid day
            if(validDayRotation.test(calEvent.summary)) {
                // Get actual day
                var day = calEvent.summary.match(/[1-6]/)[0];
                // Get date
                var start = new Date(calEvent.start);

                // Add to dayDates object
                if(typeof dayDates[day] === 'undefined') {
                    dayDates[day] = [];
                }
                dayDates[day].push({
                    year : start.getFullYear(),
                    month: start.getMonth() + 1,
                    day  : start.getDate()
                });
            }
        }

        if(_.isEmpty(dayDates)) {
            callback(null, 'The calendar does not contain the information we need! Make sure you\'re copying your personal calendar!', null);
            return;
        }

        callback(null, true, validURL);

    });
}

/**
 * Sets a user's calendar URL if valid
 * @function setUrl
 *
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

function setURL(user, url, callback) {
    if(typeof callback !== 'function') {
        callback = function() {};
    }

    users.getUser(user, function(err, isUser, userDoc) {
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

            // URL is valid, update in database
            MongoClient.connect(config.mongodbURI, function(err, db) {
                if(err) {
                    callback(new Error('There was a problem connecting to the database!'), null, null);
                    return;
                }

                var userdata = db.collection('users');

                userdata.update({ _id: userDoc['_id'] }, { $set: { portalURL: validURL }}, { upsert: true }, function(err, result) {
                    db.close();
                    if(err) {
                        callback(new Error('There was a problem updating the URL to the database!'), null, null);
                        return;
                    }

                    callback(null, true, validURL);

                });
            });
        });
    });
}

/**
 * Retrieves a person's schedule with a given date
 * @function getSchedule
 *
 * @param {string} user - Username to get schedule
 * @param {Object} date - Object containing date to retrieve schedule. Leaving fields empty will default to today
 * @param {Number} [date.year] - What year to get schedule (Optional. Defaults to current year.)
 * @param {Number} [date.month] - Month number to get schedule. (1-12) (Optional. Defaults to current month.)
 * @param {Number} [date.day] - Day of month to get schedule. (Optional. Defaults to current day.)
 * @param {getScheduleCallback} callback - Callback
 */

 /**
  * Returns a user's schedule for that day
  * @callback getScheduleCallback
  *
  * @param {Object} err - Null if success, error object if failure.
  * @param {Boolean} hasURL - Whether user has set a valid portal URL. Null if failure.
  * @param {Object} schedule - Object containing everything going on that day. Null if failure.
  * @param {Object} schedule.day - Speicifies what day it is in the schedule rotation. Null if no day is found.
  * @param {Object} schedule.classes - Array containing schedule and classes for that day. Empty array if nothing is going on that day.
  * @param {Object} schedule.allDay - Array containing all-day events or events spanning multiple days. Empty array if nothing is going on that day.
  */

function getSchedule(user, date, callback) {
    if(typeof callback !== 'function') return;

    var current = new Date();
    // Default date to current values
    if(typeof date.year !== 'number' || date.year % 1 !== 0) {
        date.year = current.getFullYear();
    }
    if(typeof date.month !== 'number' || date.month % 1 !== 0) {
        date.month = current.getMonth();
    }
    if(typeof date.day !== 'number' || date.day % 1 !== 0) {
        date.day = current.getDate();
    }

    var scheduleDate = new Date(date.year, date.month - 1, date.day);
    var scheduleNextDay = new Date(scheduleDate.getTime() + 60 * 60 * 24 * 1000);
    console.log(scheduleDate);

    users.getUser(user, function(err, isUser, userDoc) {
        /*if(err) {
            callback(err, null, null);
            return;
        }
        if(!isUser) {
            callback(new Error('User doesn\'t exist!'), null, null);
            return;
        }

        if(typeof userDoc['portalURL'] !== 'string') {
            callback(null, false, null);
            return;
        }*/

        // Just log me in for development purposes
        userDoc = {};
        userDoc['portalURL'] = 'https://micds.myschoolapp.com/podium/feed/iCal.aspx?q=9D1488C069C85337488FA341B9FBE2246226956AAC5EC29BDC1A0D5CC2CD245827955AE1CAABD230';

        request(userDoc['portalURL'], function(err, response, body) {
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

            var schedule = {
                day: null,
                classes: [],
                allDay : []
            };

            for(var eventUid in data) {
                var calEvent = data[eventUid];
                if(typeof calEvent.summary !== 'string') continue;
                // console.log(calEvent);

                var start = new Date(calEvent['start']);
                var end   = new Date(calEvent['end']);

                var startTime = start.getTime();
                var endTime   = end.getTime();

                // Make sure the event isn't all whacky
                if(endTime < startTime) continue;

                // Check if it's an all-day event
                if(startTime <= scheduleDate.getTime() && scheduleNextDay.getTime() <= endTime) {
                    // See if valid day
                    if(validDayRotation.test(calEvent.summary)) {
                        // Get actual day
                        var day = calEvent.summary.match(/[1-6]/)[0];
                        schedule.day = day;
                        continue;
                    }

                    schedule.allDay.push(utils.decodeHTMLEntity(calEvent.summary));
                }

                // See if it's part of the schedule
                if(scheduleDate.getTime() < startTime && endTime < scheduleNextDay.getTime()) {

                    // Move other (if any) events with conflicting times
                    var conflictIndexes = [];
                    for(var classIndex in schedule.classes) {
                        var scheduleClass = schedule.classes[classIndex];

                        var blockStart = scheduleClass.start.getTime();
                        var blockEnd   = scheduleClass.end.getTime();

                        // Determine start/end times relative to the class we're currently trying to add

                        if(startTime === blockStart) {
                            var startRelation = 'same start';

                        } else if(startTime === blockEnd) {
                            var startRelation = 'same end';

                        } else if(startTime < blockStart) {
                            var startRelation = 'before';

                        } else if(blockEnd < startTime) {
                            var startRelation = 'after';

                        } else if(blockStart < startTime && startTime < blockEnd) {
                            var startRelation = 'inside';
                        }

                        if(endTime === blockStart) {
                            var endRelation = 'same start';

                        } else if(endTime === blockEnd) {
                            var endRelation = 'same end';

                        } else if(endTime < blockStart) {
                            var endRelation = 'before';

                        } else if(blockEnd < endTime) {
                            var endRelation = 'after';

                        } else if(blockStart < endTime && endTime < blockEnd) {
                            var endRelation = 'inside';
                        }

                        // If new event is totally unrelated to the block, just ignore
                        if(startRelation === 'same end' || startRelation === 'after') continue;
                        if(endRelation === 'same start' || endRelation === 'before') continue;

                        // If same times, delete
                        if(startRelation === 'same start' && endRelation === 'same end') {
                            // Only push to array if index isn't already in array
                            if(!_.contains(conflictIndexes, classIndex)) {
                                conflictIndexes.push(classIndex);
                            }
                        }

                        // If new event completely engulfs the block, delete the block
                        if(startRelation === 'before' && endRelation === 'after') {
                            // Only push to array if index isn't already in array
                            if(!_.contains(conflictIndexes, classIndex)) {
                                conflictIndexes.push(classIndex);
                            }
                        }

                        // If new event is inside block
                        if(startRelation === 'inside' && endRelation == 'inside') {
                            // Split event into two
                            var newBlock = scheduleClass;
                            var oldEnd   = scheduleClass.end;

                            schedule.classes[classIndex].end = start;
                            newBlock.start = end;

                            schedule.classes.push(newBlock);
                        }

                        // If start is inside block but end is not
                        if(startRelation === 'inside' && (endRelation === 'after' || endRelation === 'same end')) {
                            schedule.classes[classIndex].end = start;
                        }

                        // If end is inside block but start is not
                        if(endRelation === 'inside' && (startRelation === 'before' || startRelation === 'same start')) {
                            schedule.classes[classIndex].start = end;
                        }
                    }

                    schedule.classes.push({
                        name : calEvent.summary,
                        start: start,
                        end  : end
                    });
                }
            }

            // Delete all conflicting classes
            conflictIndexes.sort();
            var deleteOffset = 0;
            for(var i = 0; i < conflictIndexes.length; i++) {
                var index = conflictIndexes[i] - deleteOffset++;
                schedule.classes.splice(index, 1);
            }

            // Reorder schedule because of deleted classes
            schedule.classes.sort(function(a, b) {
                return a.start - b.start;
            });

            console.log(schedule);
            callback(null, true, schedule);

        });
    });
}

/**
 * Cleans up the event titles
 * @function cleanUp
 *
 * @param {string} str - Summary to clean up
 * @returns {string}
 */

function cleanUp(str) {
    return str;
}

module.exports.verifyURL   = verifyURL;
module.exports.setURL      = setURL;
module.exports.getSchedule = getSchedule;
