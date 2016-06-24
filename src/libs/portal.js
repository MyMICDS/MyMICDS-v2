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

    // Parses the schedule for given date and returns arrays
    this.getSchedule = function(day, month, year) {
        if(this.success) {
            // Default date
            var current = new Date();
            var schedule = [];
            var events = [];
            var scheduleDay;

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
                            'name': event.summary,
                            'description': event.description,
                            'location': event.location
                        };

                        if(/^Day [1-6]/.test(period.name)) {
                            scheduleDay = parseInt(period.name.match(/[1-6]/)[0]);
                        } else {
                            events.push(period);
                        }

                    } else {
                        var startPeriod = new Date(event.start);
                        var endPeriod   = new Date(event.end);

                        var period = {
                            'start': startPeriod,
                            'end'  : endPeriod,
                            'class': event.summary,
                            'description': event.description,
                            'location': event.location
                        };

                        // Overlap existing events
                        var startTime = startPeriod.getTime();
                        var endTime   = endPeriod.getTime();

                        schedule.forEach(function(block, index) {

                            var startBlock = block.start.getTime();
                            var endBlock   = block.end.getTime();

                            // If start is inside period but end is not
                            if((startBlock < startTime && startTime < endBlock) && endBlock < endTime) {
                                schedule[index].start = endPeriod;
                            }

                            // If end is inside period but start is not
                            if((startBlock < endTime && endTime < endBlock) && startTime < startBlock) {
                                schedule[index].end = startPeriod;
                            }

                            // If event is completely inside the event we're trying to add
                            if((startBlock < startTime && startTime < endBlock) && (startBlock < endTime && endTime < endBlock)) {
                                schedule.splice(index, 1);
                            }

                            // If the event is the exact same
                            if(startBlock === startTime && endBlock === endTime) {
                                schedule.splice(index, 1);
                            }

                            // If the event we're trying to add is completely inside the event
                            if(startBlock < startTime && endTime < endBlock) {
                                // Split this old event into two
                                var oldEnd = schedule[index].end;
                                schedule[index].end = startPeriod;

                                // Create second block and push it to the schedule; We will order later
                                var newBlock = schedule[index];
                                newBlock.start = endPeriod;
                                newBlock.end   = oldEnd;

                                schedule.push(newBlock);
                            }
                        });
                        schedule.push(period);
                    }
                }
            });

            // Order schedule
            schedule.sort(function(a, b) {
                var aStart = new Date(a.start).getTime();
                var bStart = new Date(b.start).getTime();
                return aStart - bStart;
            });

            return {
                'day': scheduleDay,
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

module.exports.verifyFeed   = verifyFeed;
module.exports.scheduleFeed = scheduleFeed;
