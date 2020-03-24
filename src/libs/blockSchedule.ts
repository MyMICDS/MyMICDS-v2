import { Block } from '@mymicds/sdk';
import * as _ from 'lodash';
import moment from 'moment';
import * as users from './users';

type Days = 'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'day6';

// tslint:disable:no-var-requires
// Schedules
const highschoolSchedule = require(__dirname + '/../schedules/highschool.json') as Record<Days, DaySchedule>;
const middleschoolSchedule = {
	8: require(__dirname + '/../schedules/grade8.json') as Record<Days, DaySchedule>,
	7: require(__dirname + '/../schedules/grade7.json') as Record<Days, DaySchedule>,
	6: require(__dirname + '/../schedules/grade6.json') as Record<Days, DaySchedule>,
	5: require(__dirname + '/../schedules/grade5.json') as Record<Days, DaySchedule>
};
// tslint:enable:no-var-requires

/**
 * Gets the generic schedule for a user depending on their grade.
 * @param date Date to set class start and end times relative to.
 * @param grade User's grade (only middle and upper school grades supported), null if teacher.
 * @param day Schedule rotation day to get the schedule for, null if no rotation.
 * @param lateStart Whether or not the schedule should be late start.
 * @returns The appropriate generic schedule.
 */
function getSchedule(date: Date | moment.Moment | null, grade: number | null, day: number | null, lateStart: boolean) {
	// Validate inputs
	if (date) {
		date = moment(date);
	} else {
		date = null;
	}
	if (typeof grade !== 'number' || _.isNaN(grade) || -1 > grade || grade > 12) {
		return null;
	}
	if (typeof day !== 'number' || _.isNaN(day) || 1 > day || day > 6) {
		return null;
	}

	const schoolName = users.gradeToSchool(grade);

	// We don't have lowerschool schedules
	if (schoolName === 'lowerschool') { return null; }

	// User's final schedule
	let userSchedule: BlockFormat[] = [];

	// Use highschool schedule if upperschool
	if (schoolName === 'upperschool') {
		// Determine if lowerclassman (9 - 10) or upperclassman (11 - 12)
		const lowerclass = (grade === 9 || grade === 10);
		const upperclass = (grade === 11 || grade === 12);

		// Loop through JSON and append classes to user schedule
		const jsonSchedule = highschoolSchedule['day' + day as Days][lateStart ? 'lateStart' : 'regular'];

		for (const jsonBlock of jsonSchedule) {
			// Check for any restrictions on the block
			if (typeof (jsonBlock as AlternateBlockFormat).lowerclass !== 'undefined') {
				if ((jsonBlock as AlternateBlockFormat).lowerclass !== lowerclass) { continue; }
			}
			if (typeof (jsonBlock as AlternateBlockFormat).upperclass !== 'undefined') {
				if ((jsonBlock as AlternateBlockFormat).lowerclass !== upperclass) { continue; }
			}

			// Push to user schedule
			userSchedule.push(jsonBlock);
		}

	} else if (schoolName === 'middleschool') {
		// Directly return JSON from middleschool schedule
		userSchedule = middleschoolSchedule[grade as 8 | 7 | 6 | 5]['day' + day as Days][lateStart ? 'lateStart' : 'regular'];
	}

	// Copy the JSON so we don't modify the original reference
	userSchedule = JSON.parse(JSON.stringify(userSchedule)) as BlockFormat[];

	// If date isn't null, set times relative to date object
	if (date && userSchedule) {
		for (const schedule of userSchedule) {
			// Get start and end moment objects
			const startTime = (schedule.start as string).split(':').map(n => parseInt(n, 10));
			schedule.start = date.clone().hour(startTime[0]).minute(startTime[1]);

			const endTime = (schedule.end as string).split(':').map(n => parseInt(n, 10));
			schedule.end = date.clone().hour(endTime[0]).minute(endTime[1]);
		}
	}

	return userSchedule;
}

export interface DaySchedule {
	lunchBlock?: Block | null;
	regular: BlockFormat[];
	lateStart: BlockFormat[];
}

export interface BlockFormat {
	block: Block;
	start: string | moment.Moment;
	end: string | moment.Moment;
}

export interface AlternateBlockFormat extends BlockFormat {
	lowerclass?: true;
	upperclass?: true;
}

export interface LunchBlockFormat extends BlockFormat {
	noOverlapAddBlocks: BlockFormat[];
	sam: BlockFormat[];
	wleh: BlockFormat[];
}

export {
	getSchedule as get
};
