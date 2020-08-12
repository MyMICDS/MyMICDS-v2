import { Db } from 'mongodb';
import { GetLunchResponse, School, SchoolLunch } from '@mymicds/sdk';
import { Response } from 'request';
import moment from 'moment';
import objectAssignDeep from 'object-assign-deep';
import request from 'request-promise-native';

const lunchBaseURL =
	'https://micds.flikisdining.com/menu/api/weeks/school/mary-institute-country-day-school-micds/menu-type';
const schools: Record<School, string> = {
	lowerschool: 'middle-school-menu',
	middleschool: 'middle-school-menu',
	upperschool: 'upper-school-menu'
};

/**
 * Gets the lunch from Flik's website.
 * @param db Database connection.
 * @param date Date to get the lunch for.
 */
async function getLunch(db: Db, date: Date) {
	const currentDay = moment(date).day('Wednesday');
	const fullLunchResponse: GetLunchResponse['lunch'] = {};

	let res: Response;
	try {
		for (const school of Object.keys(schools) as School[]) {
			const schoolUrl = schools[school];
			const lunchUrl = `${lunchBaseURL}/${schoolUrl}/${currentDay.year()}/${
				currentDay.month() + 1
			}/${currentDay.date()}`;
			// Send POST request to lunch website
			res = await request.get(lunchUrl, {
				resolveWithFullResponse: true,
				simple: false,
				json: true
			});

			// if (res.statusCode !== 200) { throw new Error('It appears the lunch site is down. Check again later!'); }

			objectAssignDeep(fullLunchResponse, parseLunch(school, res.body));
		}
	} catch (e) {
		throw new Error(`There was a problem fetching the lunch data! (${(e as Error).message})`);
	}

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

	return fullLunchResponse;
}

/**
 * Parses Flik's JSON data into our API
 * @param school The school to get data for.
 * @param body HTML body of the page.
 * @returns An object with the lunch data.
 */
// TODO: Check the format of the Flik lunch body
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLunch(school: School, body: any) {
	const json: { [date: string]: Partial<Record<School, SchoolLunch>> } = {};

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
				if (!json[date][school]!.categories[latestCategory]) {
					json[date][school]!.categories[latestCategory] = [];
				}
				json[date][school]!.categories[latestCategory].push(item.food.name);
			}
		}
	}

	return json;
}

export { getLunch as get, parseLunch as parse };
