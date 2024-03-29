import { Db } from 'mongodb';
import { GetLunchResponse, School, SchoolLunch } from '@mymicds/sdk';
import { InternalError } from './errors';
import axios from 'axios';
import moment from 'moment';
import objectAssignDeep from 'object-assign-deep';

const schools: Record<School, string> = {
	lowerschool: 'lower-school',
	middleschool: 'lower-and-middle-school-menu',
	upperschool: 'upper-school-menu'
};

function generateLunchUrl(school: string, date: Date) {
	const dateStr = moment(date).day('Wednesday').format('YYYY/MM/DD');
	return `https://micds.api.flikisdining.com/menu/api/weeks/school/${school}/menu-type/lunch/${dateStr}/`;
}

/**
 * Gets the lunch from Flik's website.
 * @param db Database connection.
 * @param date Date to get the lunch for.
 */
async function getLunch(db: Db, date: Date) {
	const fullLunchResponse: GetLunchResponse['lunch'] = {};

	try {
		for (const school of Object.keys(schools) as School[]) {
			const schoolUrl = schools[school];
			const lunchUrl = generateLunchUrl(schoolUrl, date);

			// Send request to lunch website
			const res = await axios.get(lunchUrl);

			objectAssignDeep(fullLunchResponse, parseLunch(school, res.data));
		}
	} catch (e) {
		throw new InternalError('There was a problem fetching the lunch data!', e);
	}

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
