import { Block } from '@mymicds/sdk';
import * as users from './users';
import moment from 'moment';

type Days = 'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'day6';

import grade5Schedule from '../schedules/grade5.json';
import grade6Schedule from '../schedules/grade6.json';
import grade7Schedule from '../schedules/grade7.json';
import grade8Schedule from '../schedules/grade8.json';
import hsSchedule from '../schedules/highschool.json';

const highschoolSchedule = hsSchedule as Record<Days, DaySchedule>;
const middleschoolSchedule = {
	8: grade8Schedule as Record<Days, DaySchedule>,
	7: grade7Schedule as Record<Days, DaySchedule>,
	6: grade6Schedule as Record<Days, DaySchedule>,
	5: grade5Schedule as Record<Days, DaySchedule>
};

/**
 * Gets the generic schedule for a user depending on their grade.
 * @param date Date to set class start and end times relative to.
 * @param grade User's grade (only middle and upper school grades supported), null if teacher.
 * @param day Schedule rotation day to get the schedule for, null if no rotation.
 * @param lateStart Whether or not the schedule should be late start.
 * @returns The appropriate generic schedule.
 */
function getSchedule(
	date: Date | moment.Moment | null,
	grade: number | null,
	day: number | null,
	lateStart: boolean
) {
	// Validate inputs
	if (date) {
		date = moment(date);
	} else {
		date = null;
	}
	if (typeof grade !== 'number' || Number.isNaN(grade) || -1 > grade || grade > 12) {
		return null;
	}
	if (typeof day !== 'number' || Number.isNaN(day) || 1 > day || day > 6) {
		return null;
	}

	const schoolName = users.gradeToSchool(grade);

	// We don't have lowerschool schedules
	if (schoolName === 'lowerschool') {
		return null;
	}

	// User's final schedule
	let userSchedule: BlockFormat[] = [];

	// Use highschool schedule if upperschool
	if (schoolName === 'upperschool') {
		// Determine if lowerclassman (9 - 10) or upperclassman (11 - 12)
		const lowerclass = grade === 9 || grade === 10;
		const upperclass = grade === 11 || grade === 12;

		// Loop through JSON and append classes to user schedule
		const jsonSchedule =
			highschoolSchedule[`day${day}` as Days][lateStart ? 'lateStart' : 'regular'];

		for (const jsonBlock of jsonSchedule) {
			// Check for any restrictions on the block
			if (typeof (jsonBlock as AlternateBlockFormat).lowerclass !== 'undefined') {
				if ((jsonBlock as AlternateBlockFormat).lowerclass !== lowerclass) {
					continue;
				}
			}
			if (typeof (jsonBlock as AlternateBlockFormat).upperclass !== 'undefined') {
				if ((jsonBlock as AlternateBlockFormat).lowerclass !== upperclass) {
					continue;
				}
			}

			// Push to user schedule
			userSchedule.push(jsonBlock);
		}
	} else if (schoolName === 'middleschool') {
		// Directly return JSON from middleschool schedule
		userSchedule =
			middleschoolSchedule[grade as 8 | 7 | 6 | 5][`day${day}` as Days][
				lateStart ? 'lateStart' : 'regular'
			];
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

export { getSchedule as get };
