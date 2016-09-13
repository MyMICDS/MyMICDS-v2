'use strict';

/**
 * @file Scraps the lunch from the school website
 * @module lunch
 */

try {
	var config = require(__dirname + '/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

var fs      = require('fs-extra');
var request = require('request');
var cheerio = require('cheerio');
var moment  = require('moment');
var utils   = require(__dirname + '/utils.js');
var admins  = require(__dirname + '/admins.js');

var lunchURL = 'http://myschooldining.com/MICDS/calendarWeek';
var schools  = ['Lower School', 'Middle School', 'Upper School'];
var JSONPath = __dirname + '/../public/json/weather.json';

/**
 * Gets the lunch from /src/api/lunch.json. Will create one if it doesn't already exist.
 * @function getLunch
 *
 * @param {Object} date - Javascript Date Object containing date to retrieve lunch. If invalid, defaults to today.
 * @param {Object} db - Database object
 * @param {getLunchCallback} callback - Callback
 */

/**
 * Returns JSON containing lunch for week
 * @callback getLunchCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} lunchJSON - JSON of lunch menu for the week. Null if error.
 */

function getLunch(date, db, callback) {
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	var currentDay = moment(date).day('Wednesday');

	// Send POST request to lunch website
	request.post(lunchURL, { form: { 'current_day': currentDay.format() }}, function(err, res, body) {
		if(err) {
			callback(new Error('There was a problem fetching the lunch data!'), null);
			return;
		}
		if(res.statusCode !== 200) {
			admins.sendEmail(db, {
				subject: "Error Notification - Lunch Retrieval",
				html: "There was a problem with the lunch URL.<br>Error message: " + err
			}, function(err) {
				callback(new Error('There was a problem with sending the admin error notification!'), null);
				return;
			});
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
		var date = day.attr('this_date');
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
					json[dateString][schoolFilter(school)] = json[dateString][schoolFilter(school)] || {};

					json[dateString][schoolFilter(school)]['title'] = lunchTitle;
					json[dateString][schoolFilter(school)]['categories'] = json[dateString][schoolFilter(school)]['categories'] || {};
					json[dateString][schoolFilter(school)]['categories'][categoryTitle] = json[dateString][schoolFilter(school)]['categories'][categoryTitle] || [];

					for(var j = 0; j < food.length; j++) {
						json[dateString][schoolFilter(school)]['categories'][categoryTitle].push(food[j]);
					}

				});

			}

		}

	});

	return json;
}

/**
 * Removes spaces and makes whole string lowercase for JSON
 * @function schoolFilter
 * @param {string} school - String with school name
 * @returns {string}
 */

function schoolFilter(school) {
	return school.replace(/\s+/g, '').toLowerCase();
}

module.exports.get   = getLunch;
module.exports.parse = parseLunch;
