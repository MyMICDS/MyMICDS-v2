'use strict';

/**
 * @file Scraps the lunch from the school website
 * @module lunch
 */

var fs      = require('fs-extra');
var request = require('request');
var cheerio = require('cheerio');
var utils   = require(__dirname + '/utils.js');

var lunchURL = 'http://myschooldining.com/MICDS/calendarWeek';
var schools  = ['Lower School', 'Middle School', 'Upper School'];
var JSONPath = __dirname + '/../public/json/weather.json';

/**
 * Gets the lunch from /src/api/lunch.json. Will create one if it doesn't already exist.
 * @function getLunch
 *
 * @param {Object} date - Object containing date to retrieve lunch. Leaving fields empty will default to today
 * @param {Number} [date.year] - What year to get lunch (Optional. Defaults to current year.)
 * @param {Number} [date.month] - Month number to get lunch. (1-12) (Optional. Defaults to current month.)
 * @param {Number} [date.day] - Day of month to get lunch. (Optional. Defaults to current day.)
 * @param {getLunchCallback} callback - Callback
 */

/**
 * Returns JSON containing lunch for week
 * @callback getLunchCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} lunchJSON - JSON of lunch menu for the week. Null if error.
 */

function getLunch(date, callback) {

	if(typeof callback !== 'function') return;

	var current = new Date();
	// Default date to current values
	if(typeof date.year !== 'number' || date.year % 1 !== 0) {
		date.year = current.getFullYear();
	}
	if(typeof date.month !== 'number' || date.month % 1 !== 0) {
		date.month = current.getMonth() + 1;
	}
	if(typeof date.day !== 'number' || date.day % 1 !== 0) {
		date.day = current.getDate();
	}

	var currentDay = new Date(date.year, date.month - 1, date.day);

	// Send POST request to lunch website
	request.post(lunchURL, { form: { 'current_day': currentDay }}, function(err, res, body) {
		if(err) {
			callback(new Error('There was a problem fetching the lunch data!'), null);
			return;
		}
		if(res.statusCode !== 200) {
			/**
			 * @TODO -
			 * This should never happen and could mean the URL changed.
			 * It should send email to MyMICDS Devs.
			 */
			callback(new Error('There was a problem with the lunch URL!'), null);
			return;
		}

		var lunchJSON = parseLunch(body);
		callback(null, lunchJSON);

	});
}

/**
 * Takes the body of the school's lunch page and returns lunch JSON
 * @function parseLunch
 *
 * @param {string} body - Body of HTML
 * @returns {Object}
 */

function parseLunch(body) {

	// Clean up HTML to prevent cheerio from becoming confused
	body.replace('<<', '&lt;&lt;');
	body.replace('>>', '&gt;&gt;');

	var $ = cheerio.load(body);
	var json = {};

	var table = $('table#table_calendar_week');
	var weekColumns = table.find('td');

	weekColumns.each(function(index) {

		var day  = $(this);
		var date = day.attr('day_no');
		var dateObject = new Date(date);
		var dateString = dateObject.getFullYear()
			+ '-' + utils.leadingZeros(dateObject.getMonth() + 1)
			+ '-' + utils.leadingZeros(dateObject.getDate());

		for(var i = 0; i < schools.length; i++) {
			var school = schools[i];

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
					json[dateString] = json[dateString] || {};
					json[dateString][school] = json[dateString][school] || {};

					json[dateString][school]['title'] = lunchTitle;

					json[dateString][school][categoryTitle] = json[dateString][school][categoryTitle] || [];

					for(var j = 0; j < food.length; j++) {
						json[dateString][school][categoryTitle].push(food[j]);
					}

				});

			}

		}

	});

	return json;
}

module.exports.get   = getLunch;
module.exports.parse = parseLunch;
