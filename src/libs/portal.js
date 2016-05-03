/**
 * @file Reads calendar feed to determine schedule / day and other important events
 * @module portal
 */

var request = require('request');
var cheerio = require('cheerio');
var ical    = require('ical');
var _       = require('underscore');

/**
 * Verifies that an iCal feed is from the portal, and identifies which calendars are existing
 * @function verifyFeed
 * 
 * @param {string} url - URI to iCal feed
 * @param {verifyFeedCallback} callback - Callback after calendar feed is gotten
 */

/**
 * Callback after feed is gotten
 * @callback verifyFeedCallback
 * 
 * @param {Boolean} success - True if success, false if error
 * @param {string} message - Description of success / error
 * @param {string} raw - Raw body of calender request
 * @param {string} url - Valid url
 */

function verifyFeed(url, callback) {
    
    if(typeof url === 'undefined') {
        var success = false;
        var message = 'Invalid URL!';
        var raw = null;
        if(typeof callback === 'function') callback(success, message, raw, null);
        return;
    }
    
    // Make sure URL is correct protocol
    var url = url.trim().replace('webcal://', 'https://');
    
    request(url, function(error, response, body) {
        if(!error) {
            var success = true;
            var message = 'Successfully got calendar feed!';
            var raw = body;
        } else {
            var success = false;
            var message = 'There was a problem getting the calendar feed!';
            var raw = null;
        }
        if(typeof callback === 'function') callback(success, message, raw, url);
    });
}

/**
 * Queries a person's Portal RSS feed to get schedule and stuff
 * @function scheduleFeed
 * 
 * @param {string} url - URL to iCal feed
 * @param {scheduleFeedCallback} callback - Callback after schedule is parsed
 */

/**
 * Callback after schedule feed is parsed
 * @callback scheduleFeedCallback
 * 
 * @param {Object} that - Object reference to the schedule feed
 */

function scheduleFeed(url, callback) {
    var that = this;
    that.success = null;
    
    this.getSchedule = function(day, month, year) {
        if(this.success) {
            // Default date
            var current = new Date();
            var schedule = [];
            var events = [];

            day = day || current.getDate();
            month = month || current.getMonth();
            year = year || current.getFullYear();

            // Get schedule from feed
            _.each(this.parsed, function(event, uid) {
                var eventDate = new Date(event.start);
                if(eventDate.getDate() === day && eventDate.getMonth() === month && eventDate.getFullYear() === year) {

                    // Check if it's an all-day event
                    if(eventDate.getSeconds() === 0 && eventDate.getMinutes() === 0 && eventDate.getHours() === 0) {
                        var period = {
                            'class': event.summary,
                            'location': event.location
                        };
                        events.push(period)
                    } else {
                        var period = {
                            'start': event.start,
                            'end'  : event.end,
                            'class': event.summary,
                            'location': event.location
                        };
                        schedule.push(period);
                    }
                }
            });

            return {
                'schedule': schedule,
                'events'  : events
            };
        } else {
            return {};
        }
    }
    
    verifyFeed(url, function(success, message, raw) {
        if(success) {
            that.success = true;
            that.message = message;
            that.parsed = ical.parseICS(raw);
        } else {
            that.success = false;
            that.message = message;
            that.parsed = null;
        }
        if(typeof callback === 'function') callback(that);
    });
    
}

module.exports.verifyFeed = verifyFeed;
module.exports.scheduleFeed = scheduleFeed;