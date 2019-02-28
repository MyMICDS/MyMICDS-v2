import { GetLunchResponse, School } from '@mymicds/sdk';
import * as cheerio from 'cheerio';
import moment from 'moment';
import { Db } from 'mongodb';
import { Response } from 'request';
import request from 'request-promise-native';
import * as utils from './utils';

const lunchURL = 'https://myschooldining.com/MICDS/calendarWeek';
const schools = ['Lower School', 'Middle School', 'Upper School'];

/**
 * Gets the lunch from Flik's website.
 * @param db Database connection.
 * @param date Date to get the lunch for.
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
 * Scrapes Flik's lunch page into JSON data.
 * @param body HTML body of the page.
 * @returns An object with the lunch data.
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
 * Filters the name of each school.
 * @param school The school name to filter.
 * @returns A school name formatted for JSON use.
 */
function schoolFilter(school: string) {
	return school.replace(/\s+/g, '').toLowerCase() as School;
}

export {
	getLunch as get,
	parseLunch as parse
};
