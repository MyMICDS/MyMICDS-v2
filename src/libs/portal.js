/**
 * @file Reads calendar feed to determine schedule / day and other important events
 * @module portal
 */

var config = require(__dirname + '/config.js');

var _           = require('underscore');
var ical        = require('ical');
var querystring = require('querystring');
var request     = require('request');
var url         = require('url');

// URL Calendars come from
var urlPrefix = 'https://micds.myschoolapp.com/podium/feed/iCal.aspx?q=';
// Valid School Calendar ID.
// It doesn't matter which student this calendar belongs to, we just need to compare it
var schoolCalURL = urlPrefix + config.portal.schoolCalId;
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

        // Another fun thing about working with the portal is you can't tell what type of calendar we have.
        // We need to compare it with one of our school calendars
        request(schoolCalURL, function(err, schoolResponse, schoolBody) {
            if(err || response.statusCode !== 200) {
                callback(new Error('There was a problem fetching portal data from the URL!'), null, null);
                return;
            }

            // Put both inputted calendar and school calendar into arrays
            var schoolData = ical.parseICS(schoolBody);
            var calEvents = [];
            for(var eventUid in data) {
                var calEvent = data[eventUid];
                delete calEvent.uid;
                calEvents.push(calEvent);
            }
            var schoolCalEvents = [];
            for(var eventUid in schoolData) {
                var calEvent = schoolData[eventUid];
                delete calEvent.uid;
                schoolCalEvents.push(calEvent);
            }

            // If both calendar lengths are the same, they're probably the same
            /**
             * @TODO - Maybe in the future we can actually scan how similar the calendar content is like so:
             * https://github.com/michaelgira23/MyMICDS-v2/commit/5a6fc1184abe68666bebbd3fa0ac9b88236d9af1#diff-5ff9dd53cfe4a269b80eeaedd7a6bd5dR107
             */
            if(schoolCalEvents.length === calEvents.length) {
                callback(null, 'This is your school calendar, we need your personal calendar!', null);
                return;
            }

            /*
            // Make sure schedule is in the calendar - that's all we really care about
            var eventsOccur = {};
            for(var i = 0; i < calEvents.length; i++) {
                var calEvent = calEvents[i];
                if(typeof calEvent.summary === 'string') {
                    eventsOccur[calEvent.summary] = ++eventsOccur[calEvent.summary] || 1;
                }
            }

            // Make an array of top events and sort them by amount of times in schedule
            var reoccurringEvents = [];
            for(var eventSummary in eventsOccur) {
                if(eventsOccur[eventSummary] > 1) {
                    reoccurringEvents.push({
                        summary: eventSummary,
                        times  : eventsOccur[eventSummary]
                    });
                }
            }
            reoccurringEvents.sort(function(a, b) {
                if(a.times > b.times) {
                    return -1;
                } else if(a.times < b.times) {
                    return 1;
                } else {
                    return 0;
                }
            });
            */

            // Look through every 'Day # (US/MS)' andd see how many events there are
            var dayDates = {};
            for(var i = 0; i < calEvents.length; i++) {
                var calEvent = calEvents[i];
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

            if(_.isEmpty(data)) {
                callback(null, 'Invalid calendar! Make sure you\'re copying your personal calendar!', null);
                return;
            }

            callback(null, true, validURL);

        });

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

module.exports.verifyURL    = verifyURL;
module.exports.scheduleFeed = scheduleFeed;
