/**
 * @file Queries the Snowday Calculator
 * @module snowdayCalculator
 */

var $       = require('cheerio');
var moment  = require('moment');
var request = require('request');

var zipcode = 63124;
var schoolId = 663;
var snowdays = 0;

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

function calculate(callback) {
	if(typeof callback !== 'function') return;

	request.get({
		url: 'http://www.snowdaycalculator.com/Apps/jsPred.php',
		qs: {
			zipcode: zipcode,
			snowdays: snowdays,
			school: schoolId
		}
	}, function(err, res, body) {
		if(err || res.statusCode !== 200) {
			callback(new Error('There was a problem querying the Snowday Calculator!'), null);
			return;
		}

		// Snowday Calculator is weird and transfers Javascript code, so we use RegEx to get the values
		var variables = body.match(/[a-zA-Z]+\[\d+\] = .+;/g);

		// Map variable names to what they mean
		var labels = {
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
		var data = {};
		for(var i = 0; i < variables.length; i++) {
			var variable = variables[i];

			// Split variable into the two parts on either side of equals
			var parts = variable.split(' = ');

			// Get variable name and date
			var varName = parts[0];
			var name = varName.match(/[a-zA-Z]+(?=\[)/);
			var dateString = varName.match(/(?!\[)\d+(?=\])/);

			// If variable name isn't mapped, we don't care about it
			if(!labels[name]) continue;

			// Get value of variable (we need `eval` in order to parse concatenated strings)
			var value = eval(parts[1]);

			// Get date (which is index of array)
			var date = moment(dateString, 'YYYYMMDD');
			var formatDate = date.format('YYYY-MM-DD');

			// If value is string, strip away HTML and remove redundant whitespaces
			if(typeof value === 'string') {
				value = $(value).text();
				value = value.replace(/\s+/g, ' ');
			}

			// Set to data object
			if(!data[formatDate]) {
				data[formatDate] = {};
			}
			data[formatDate][labels[name]] = value;
		}

		callback(null, data);

	});
}

module.exports.calculate = calculate;
