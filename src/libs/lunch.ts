import { GetLunchResponse, School } from '@mymicds/sdk';
import * as cheerio from 'cheerio';
import moment from 'moment';
import { Db } from 'mongodb';
import { Response } from 'request';
import request from 'request-promise-native';
import * as utils from './utils';

const lunchURL = 'http://myschooldining.com/MICDS/calendarWeek';
const schools = ['Lower School', 'Middle School', 'Upper School'];

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

async function getLunch(db: Db, date: Date) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const currentDay = moment(date).day('Wednesday');

	let res: Response;
	try {
		// Send POST request to lunch website
		res = await request.post(lunchURL, {
			form: { current_day: currentDay.format() },
			resolveWithFullResponse: true,
			simple: false
		});
	} catch (e) {
		throw new Error('There was a problem fetching the lunch data!');
	}

	if (res.statusCode !== 200) { throw new Error('It appears the lunch site is down. Check again later!'); }

	// Alert admins if lunch page has moved
	// admins.sendEmail(db, {
	// 	subject: 'Error Notification - Lunch Retrieval',
	// 	html: 'There was a problem with the lunch URL.<br>Error message: ' + err
	// }, err => {
	// 	if (err) {
	// 		console.log('[' + new Date() + '] Error occured when sending admin error notifications! (' + err + ')');
	// 		return;
	// 	}
	// 	console.log('[' + new Date() + '] Alerted admins of error! (' + err + ')');
	// });

	// callback(new Error('There was a problem with the lunch URL!'), null);

	return parseLunch(res.body as string);
}

/**
 * Takes the body of the school's lunch page and returns lunch JSON
 * @function parseLunch
 *
 * @param {string} body - Body of HTML
 * @returns {Object}
 */

function parseLunch(body: string) {
	// Clean up HTML to prevent cheerio from becoming confused
	body.replace('<<', '&lt;&lt;');
	body.replace('>>', '&gt;&gt;');

	const $ = cheerio.load(body);
	const json: GetLunchResponse['lunch'] = {};

	const table = $('table#table_calendar_week');
	const weekColumns = table.find('td');

	weekColumns.each(function(this: any) {
		// I'm having trouble importing some of the Cheerio types, but we're only using the `this` value here
		// so it doesn't really matter exactly what type it is
		const day = $(this);
		const date = day.attr('this_date');
		const dateObject = new Date(date);
		const dateString = dateObject.getFullYear()
			+ '-' + utils.leadingZeros(dateObject.getMonth() + 1)
			+ '-' + utils.leadingZeros(dateObject.getDate());

		for (const school of schools) {
			const schoolLunch = day.find('div[location="' + school + '"]');

			// Make sure it's not the weekend
			if (schoolLunch.length > 0) {
				const lunchTitle = schoolLunch.find('span.period-value').text().trim();
				const categories = schoolLunch.find('div.category-week');

				categories.each(function(this: any) {
					const category = $(this);
					const food: string[] = [];
					const categoryTitle = category.find('span.category-value').text().trim();
					const items = category.find('div.item-week');

					items.each(function(this: any) {
						food.push($(this).text().trim());
					});

					// Add to JSON
					json[dateString] = json[dateString] || {};
					json[dateString][schoolFilter(school)] = json[dateString][schoolFilter(school)] || {};

					json[dateString][schoolFilter(school)].title = lunchTitle;
					json[dateString][schoolFilter(school)].categories =
						json[dateString][schoolFilter(school)].categories || {};
					json[dateString][schoolFilter(school)].categories[categoryTitle] =
						json[dateString][schoolFilter(school)].categories[categoryTitle] || [];

					for (const f of food) {
						json[dateString][schoolFilter(school)].categories[categoryTitle].push(f);
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

function schoolFilter(school: string) {
	return school.replace(/\s+/g, '').toLowerCase() as School;
}

export {
	getLunch as get,
	parseLunch as parse
};
