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
  * @param {Object} schedule - Array containing classes
  */

function getSchedule(user, date, callback) {
    if(typeof callback !== 'function') return;

    var current = new Date();
    // Default date to current values
    if(typeof date !== 'object') {
        date = {};
    }
    if(typeof date.year !== 'number' || date.year % 1 !== 0) {
        date.year = current.getFullYear();
    }
    if(typeof date.month !== 'number' || date.month % 1 !== 0) {
        date.month = current.getMonth();
    }
    if(typeof date.day !== 'number' || date.day % 1 !== 0) {
        date.day = current.getDate();
    }
    var scheduleDate = new Date(date.year, date.month, date.day);
}

module.exports.verifyURL   = verifyURL;
module.exports.setURL      = setURL;
module.exports.getSchedule = getSchedule;
