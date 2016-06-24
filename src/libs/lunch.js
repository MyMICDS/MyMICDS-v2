/**
 * @file Scraps the lunch from the school website
 * @module lunch
 */

var fs      = require('node-fs-extra');
var request = require('request');
var cheerio = require('cheerio');

var lunchURL = 'http://www.myschooldining.com/MICDS';
var schools  = ['Lower School', 'Middle School', 'Upper School'];
var JSONPath = __dirname + '/../api/lunch.json';

/**
 * Get's the lunch from /src/api/lunch.json. Will create one if it doesn't already exist.
 * @function getLunch
 *
 * @param {getLunchCallback} callback - Callback
 */

/**
 * Callback after lunch is retrieved from /src/api/lunch.json
 * @callback getLunchCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Object} lunchJSON - JSON of lunch menu for the week. Null if error.
 */

function getLunch(callback) {

    if(typeof callback !== 'function') return;

    // Test to see if JSON path is valid. If not, create one.
    fs.stat(JSONPath, function (err, stats) {
        if(err) {
            callback(new Error('There was a problem reading the lunch JSON!'), null);
            return;
        }

        if(stats.isFile()) {
            // Great! JSONPath is valid!
            fs.readJSON(JSONPath, function(err, lunch) {
                if(err) {
                    callback(new Error('There was a problem retrieving the lunch JSON!'), null);
                    return;
                }

                callback(lunch);
            });
        } else {
            // If the lunch JSON file does not exist, let's create one
            updateLunch(callback);
        }
    });
}

/**
 * Takes the body of the school's lunch page and returns JSON
 * @function parseLunch
 *
 * @param {string} body - Body of HTML
 * @param {parseLunchCallback} callback - Callback
 */

/**
 * Callback after the lunch data is parsed
 * @callback parseLunchCallback
 *
 * @param {Object} lunchJSON - JSON output of lunch
 */

function parseLunch(body, callback) {
    var $        = cheerio.load(body);
    var json     = {};
    json['info'] = 'Visit https://mymicds.net/api for more information!';

    var table       = $('table#table_calendar_week');
    var weekColumns = table.find('td');

    weekColumns.each(function(index) {

        var day  = $(this);
        var date = day.attr('day_no');

        schools.forEach(function(school) {

            var schoolLunch = day.find('div[location="' + school + '"]');

            // Make sure it's not the weekend

            if(schoolLunch.length > 0) {

                var lunchTitle = schoolLunch.find('span.period-value').text().trim();
                var categories = schoolLunch.find('div.category-week');

                categories.each(function() {

                    var category      = $(this);
                    var food          = [];
                    var categoryTitle = category.find('span.category-value').text().trim();
                    var items         = category.find('div.item-week');

                    items.each(function() {
                        food.push($(this).text().trim());
                    });

                    // Add to JSON

                    json[date] = json[date] || {};
                    json[date][school] = json[date][school] || {};

                    json[date][school]['title'] = lunchTitle;

                    json[date][school][categoryTitle] = json[date][school][categoryTitle] || [];

                    food.forEach(function(singularVersionOfFood) {
                        json[date][school][categoryTitle].push(singularVersionOfFood);
                    });

                });

            }

        });

    });

    callback(json);
}

/**
 * Updates the lunch API and writes it into a JSON file
 * @function updateLunch
 *
 * @param {updateLunchCallback} callback - Callback
 */

/**
 * Callback after the updateLunch function
 * @callback updateLunchCallback
 *
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Object} lunchJSON - JSON of lunch menu for the week. Null if error.
 */

function updateLunch(callback) {

    if(typeof callback !== 'function') return;

    // Retrieve the HTML from the school lunch website
    request(lunchURL, function(err, res, body) {

        if(err) {
            callback(new Error('There was a problem retrieving the lunch from the school website!'), null);
            return;
        }

        // Parse the HTML into JSON
        parseLunch(body, function(lunchJSON) {

            // Write the JSON into a file
            fs.outputJSON(JSONPath, lunchJSON, function(err) {

                if(err) {
                    callback(new Error('There was a problem writing the JSON into file!'), null);
                    return;
                }

                callback(null, lunchJSON);

            });
        });
    });
}

module.exports.getLunch    = getLunch;
module.exports.parseLunch  = parseLunch;
module.exports.updateLunch = updateLunch;
