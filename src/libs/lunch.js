'use strict';

/**
 * @file Scraps the lunch from the school website
 * @module lunch
 */

let config;
try {
	config = require(__dirname + '/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const admins = require(__dirname + '/admins.js');
const fs = require('fs-extra');
const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');
const utils = require(__dirname + '/utils.js');

const lunchURL = 'http://myschooldining.com/MICDS/calendarWeek';
const schools = ['Lower School', 'Middle School', 'Upper School'];
const JSONPath = __dirname + '/../public/json/weather.json';

/**
 * Gets the lunch from /src/api/lunch.json. Will create one if it doesn't already exist.
 * @function getLunch
 *
 * @param {Object} db - Database object
 * @param {Object} date - Javascript Date Object containing date to retrieve lunch. If invalid, defaults to today.
 * @param {getLunchCallback} callback - Callback
 */

/**
 * Returns JSON containing lunch for week
 * @callback getLunchCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} lunchJSON - JSON of lunch menu for the week. Null if error.
 */

function getLunch(db, date, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	const currentDay = moment(date).day('Wednesday');

	// Send POST request to lunch website
	request.post(lunchURL, { form: { 'current_day': currentDay.format() }}, (err, res, body) => {
		if(err) {
			callback(new Error('There was a problem fetching the lunch data!'), null);
			return;
		}
		if(res.statusCode !== 200) {

			// Alert admins if lunch page has moved
			admins.sendEmail(db, {
				subject: 'Error Notification - Lunch Retrieval',
				html: 'There was a problem with the lunch URL.<br>Error message: ' + err
			}, err => {
				if(err) {
					console.log('[' + new Date() + '] Error occured when sending admin error notifications! (' + err + ')');
					return;
				}
				console.log('[' + new Date() + '] Alerted admins of error! (' + err + ')');
			});

			callback(new Error('There was a problem with the lunch URL!'), null);
			return;
		}

		const lunchJSON = parseLunch(body);
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

	let $ = cheerio.load(body);
	let json = {};

	let table = $('table#table_calendar_week');
	let weekColumns = table.find('td');

	weekColumns.each((index) => {

		let day = $(this);
		let date = day.attr('this_date');
		let dateObject = new Date(date);
		let dateString = dateObject.getFullYear()
			+ '-' + utils.leadingZeros(dateObject.getMonth() + 1)
			+ '-' + utils.leadingZeros(dateObject.getDate());

		for(let school of schools) {
			let schoolLunch = day.find('div[location="' + school + '"]');

			// Make sure it's not the weekend
			if(schoolLunch.length > 0) {

				let lunchTitle = schoolLunch.find('span.period-value').text().trim();
				let categories = schoolLunch.find('div.category-week');

				categories.each(function() {

					let category = $(this);
					let food = [];
					let categoryTitle = category.find('span.category-value').text().trim();
					let items = category.find('div.item-week');

					items.each(function() {
						food.push($(this).text().trim());
					});

					// Add to JSON
					json[dateString] = json[dateString] || {};
					json[dateString][schoolFilter(school)] = json[dateString][schoolFilter(school)] || {};

					json[dateString][schoolFilter(school)]['title'] = lunchTitle;
					json[dateString][schoolFilter(school)]['categories'] = json[dateString][schoolFilter(school)]['categories'] || {};
					json[dateString][schoolFilter(school)]['categories'][categoryTitle] = json[dateString][schoolFilter(school)]['categories'][categoryTitle] || [];

					for(let f of food) {
						json[dateString][schoolFilter(school)]['categories'][categoryTitle].push(f);
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
