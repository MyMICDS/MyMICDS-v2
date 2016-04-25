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
 * 
 * @param {string} url - URI to iCal feed
 * @param {function} callback - Callback after it verifies URI
 */

function verifyFeed(url, callback) {
    var that = this;
    
    // Make sure URL is correct protocol
    that.url = url.trim().replace('webcal://', 'https://');
    
    request(that.url, function(error, response, body) {
        if(!error) {
            that.success = true;
            that.message = 'Successfully got calendar feed!';
            that.raw = body;
        } else {
            that.success = false;
            that.message = 'There was something wrong with getting the calendar feed!';
            that.raw = null;
        }
        if(typeof callback === 'function') callback();
    });
}

/**
 * That sweet, sweet OOP. Queries a person's Portal RSS feed to get schedule and stuff
 * @function scheduleFeed
 * 
 * @param {string} url - URL to iCal feed
 * @param {scheduleFeedCallback} callback - Callback after feed is parsed
 */

/**
 * Callback after parses schedule feed
 * @callback scheduleFeedCallback
 * @param {Object} that - Schedule feed object to use for callback
 */

function scheduleFeed(url, callback) {
    var that = this;
    
    this.validate = new verifyFeed(url, function() {
        if(that.validate.success) {
            that.parsed = ical.parseICS(that.validate.raw);
        } else {
            that.parsed = null;
        }
        callback(that);
    });
    
    this.getSchedule = function(day, month, year) {
        
        // Default date
        var current = new Date();
        var schedule = [];

        day = day || current.getDate();
        month = month || current.getMonth();
        year = year || current.getFullYear();

        _.each(this.parsed, function(event, uid) {
            var eventDate = new Date(event.start);
            if(eventDate.getDate() === current.getDate() && eventDate.getMonth() === current.getMonth() && eventDate.getFullYear() === current.getFullYear()) {
                console.log('saem date');
                schedule.push(event);
            }
        });
        return schedule;
    }
}

module.exports.verifyFeed = verifyFeed;
module.exports.scheduleFeed = scheduleFeed;