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
 * @param {function} callback - Callback after calendar feed is gotten
 */

function verifyFeed(url, callback) {
    var that = this;
    
    if(typeof url === 'undefined') {
        that.success = false;
        that.message = 'Invalid URL!';
        that.raw = null;
        return;
    }
    
    // Make sure URL is correct protocol
    that.url = url.trim().replace('webcal://', 'https://');
    
    request(that.url, function(error, response, body) {
        if(!error) {
            that.success = true;
            that.message = 'Successfully got calendar feed!';
            that.raw = body;
        } else {
            that.success = false;
            that.message = 'There was a problem getting the calendar feed!';
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
 * @param {function} callback - Callback after schedule is parsed
 */

function scheduleFeed(url, callback) {
    var that = this;
    
    this.validate = new verifyFeed(url, function() {
        if(that.validate.success) {
            that.parsed = ical.parseICS(that.validate.raw);
        } else {
            that.parsed = null;
        }
        if(typeof callback === 'function') callback();
    });
    
    this.getSchedule = function(day, month, year) {
        
        // Default date
        var current = new Date();
        var schedule = [];

        day = day || current.getDate();
        month = month || current.getMonth();
        year = year || current.getFullYear();
        
        // Get schedule from feed
        _.each(this.parsed, function(event, uid) {
            var eventDate = new Date(event.start);
            if(eventDate.getDate() === current.getDate() && eventDate.getMonth() === current.getMonth() && eventDate.getFullYear() === current.getFullYear()) {
                var period = {
                    'start': event.start,
                    'end'  : event.end,
                    'class': event.summary,
                    'location': event.location
                };
                
                // Check if it's an all-day event
                // @todo
                
                schedule.push(period);
                console.log(event);
            }
        });
        
        return schedule;
    }
}

module.exports.verifyFeed = verifyFeed;
module.exports.scheduleFeed = scheduleFeed;