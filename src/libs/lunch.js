'use strict';

/**
 * @file Scraps the lunch from the school website
 * @module lunch
 */

const admins = require(__dirname + '/admins.js');
const request = require('request');
const moment = require('moment');
const objectAssignDeep = require('object-assign-deep');

const lunchBaseURL = 'https://micds.flikisdining.com/menu/api/weeks/school/mary-institute-country-day-school-micds/menu-type';
const schools = {
	lowerschool: 'lunch',
	middleschool: 'middle-school-menu',
	upperschool: 'upper-school-menu'
};

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
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	const currentDay = moment(date).day('Wednesday');
	const fullLunchResponse = {};

	const getSchoolLunch = i => {
		// Send GET request to lunch website
		const schoolKeys = Object.keys(schools);
		const school = schoolKeys[i];
		const schoolUrl = schools[school];
		const lunchUrl =
			`${lunchBaseURL}/${schoolUrl}/${currentDay.year()}/${currentDay.month() + 1}/${currentDay.date()}`;

		request.get(lunchUrl, { json: true }, (err, res, body) => {
			if (err) {
				callback(new Error('There was a problem fetching the lunch data!'), null);
				return;
			}
			if (res.statusCode !== 200) {

				// Alert admins if lunch page has moved
				// admins.sendEmail(db, {
				// 	subject: 'Error Notification - Lunch Retrieval',
				// 	html: 'There was a problem with the lunch URL.<br>Error message: ' + err
				// }, err => {
				// 	if(err) {
				// 		console.log('[' + new Date() + '] Error occured when sending admin error notifications! (' + err + ')');
				// 		return;
				// 	}
				// 	console.log('[' + new Date() + '] Alerted admins of error! (' + err + ')');
				// });

				// callback(new Error('There was a problem with the lunch URL!'), null);
				callback(new Error('It appears the lunch site is down. Check again later!'), null);
				return;
			}

			objectAssignDeep(fullLunchResponse, parseLunch(school, body));

			if (i < schoolKeys.length - 1) {
				getSchoolLunch(++i);
			} else {
				callback(null, fullLunchResponse);
			}
		});
	};
	getSchoolLunch(0);
}

/**
 * Takes the body of the school's lunch page and returns lunch JSON
 * @function parseLunch
 *
 * @param {string} body - Body of HTML
 * @returns {Object}
 */

function parseLunch(school, body) {
	const json = {};

	for (const day of body.days) {
		const date = day.date;

		json[date] = {
			[school]: {
				title: 'Yummy Lunch',
				categories: {}
			}
		};

		let latestCategory = null;
		for (const item of day.menu_items) {
			if (item.text) {
				latestCategory = item.text;
			} else if (latestCategory && item.food) {
				if (!json[date][school].categories[latestCategory]) {
					json[date][school].categories[latestCategory] = [];
				}
				json[date][school].categories[latestCategory].push(item.food.name);
			}
		}
	}

	return json;
}

module.exports.get = getLunch;
module.exports.parse = parseLunch;
