/**
 * @file Reads calendar feed to determine events and such from Canvas
 * @module canvas
 */

var ical 	= require('ical');
var request = require('request');
var url     = require('url');

// URL Calendars come from
var urlPrefix = 'https://micds.instructure.com/feeds/calendars/';

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

function verifyURL(canvasURL, callback) {

    if(typeof callback !== 'function') return;

    if(typeof canvaslURL !== 'string') {
        callback(new Error('Invalid URL!'), null, null);
        return;
    }

    // Parse URL first
    var parsedURL = url.parse(canvasURL);

    // Check if pathname is valid
    if(!parsedURL.path.startsWith('/feeds/calendars/')) {
        // Not a valid URL!
        callback(null, 'Invalid URL path for Canvas calendar!', null);
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

module.exports.verifyURL = verifyURL;
