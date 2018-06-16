'use strict';

/**
 * @file Queries the Snowday Calculator
 * @module snowdayCalculator
 */

const $ = require('cheerio');
const moment = require('moment');
const request = require('request-promise-native');

const zipcode = 63124;
// PHP back-end was throwing an error sometimes if school id was inputted
// const schoolId = 663;
const schoolId = '';
const snowdays = 0;

/**
 * Queries the Snowday Calculator's API for a prediction at the location of MICDS
 * @function calculate
 *
 * @param {calculateCallback} callback - Callback
 */

/**
 * Returns data from Snowday Calculator
 * @callback calculateCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} data - Returns object containing data for the next two days from Snowday Calculator. Null if error.
 */

async function calculate() {
	let body;
	try {
		body = await request.get({
			url: 'http://www.snowdaycalculator.com/Apps/jsPred.php',
			qs: {
				zipcode,
				snowdays,
				school: schoolId
			},
			gzip: true
		});
	} catch (e) {
		throw new Error('There was a problem querying the Snowday Calculator!');
	}

	// Snowday Calculator is weird and transfers Javascript code, so we use RegEx to get the values
	const variables = body.match(/[a-zA-Z]+\[\d+] = .+;/g);

	// If for some reason there are no variables
	if (!variables) {
		// This is not expected; alert admins
		// admins.sendEmail(db, {
		// 	subject: 'Error Notification - Snowday Calculator',
		// 	html: 'There was a problem with the retrieving snowday calculator values.<br>Error message: ' + err
		// }, function(err) {
		// 	if (err) {
		// 		console.log('[' + new Date() + '] Error occured when sending admin error notifications! (' + err + ')');
		// 		return;
		// 	}
		// 	console.log('[' + new Date() + '] Alerted admins of error! (' + err + ')');
		// });

		return {};
	}

	// Map variable names to what they mean
	const labels = {
		s: 'start',
		f: 'finish',
		st: 'strength',
		c: 'chance',
		inches: 'inches',
		t: 'temperature',
		e: 'extraFactor',
		mess: 'message',
		theChance: 'chance'
	};

	// Loop through all matches of Javascript variables and assign to data object
	const data = {};
	for (const variable of variables) {
		// Split variable into the two parts on either side of equals
		const parts = variable.split(' = ');

		// Get variable name and date
		const varName = parts[0];
		const name = varName.match(/[a-zA-Z]+(?=\[)/);
		const dateString = varName.match(/(?!\[)\d+(?=\])/);

		// If variable name isn't mapped, we don't care about it
		if (!labels[name]) continue;

		// Get value of variable (we need `eval` in order to parse concatenated strings)
		let value = eval(parts[1]); // eslint-disable-line

		// Get date (which is index of array)
		const date = moment(dateString, 'YYYYMMDD');
		const formatDate = date.format('YYYY-MM-DD');

		// If value is string, strip away HTML and remove redundant whitespaces
		if (typeof value === 'string') {
			value = $(value).text();
			value = value.replace(/\s+/g, ' ');
		}

		// Set to data object
		if (!data[formatDate]) {
			data[formatDate] = {};
		}
		data[formatDate][labels[name]] = value;
	}

	return data;
}

module.exports.calculate = calculate;
