import { Block } from '@mymicds/sdk';
import * as users from './users';
import moment from 'moment';

type Days = 'Aday' | 'Bday' | 'Cday' | 'Dday' | 'Eday' | 'Fday' | 'Gday' | 'Hday';

import hsSchedule from '../schedules/2020/regular_HS.json';
import grade5Schedule from '../schedules/2020/5and7.json';
import grade6Schedule from '../schedules/2020/6and8.json';
import grade7Schedule from '../schedules/2020/5and7.json';
import grade8Schedule from '../schedules/2020/6and8.json';

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
	day: string | null,
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
	if (typeof day !== 'string' || (/([A-H])/.exec(day) ?? []).length < 1) {
		return null;
	}

	const schoolName = users.gradeToSchool(grade);

	// We don't have lowerschool schedules
	if (schoolName === 'lowerschool') {
		return null;
	}

	// User's final schedule
	let userSchedule: BlockFormats = {
		blocks: [],
		lunchBlock: null
	};

	// Use highschool schedule if upperschool
	if (schoolName === 'upperschool') {
		// Determine if lowerclassman (9 - 10) or upperclassman (11 - 12)
		const lowerclass = grade === 9 || grade === 10;
		const upperclass = grade === 11 || grade === 12;

		// Loop through JSON and append classes to user schedule
		const jsonSchedule =
			highschoolSchedule[`${day.toUpperCase()}day` as Days][
				lateStart ? 'lateStart' : 'regular'
			];

		for (const jsonBlock of jsonSchedule!.blocks) {
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
			userSchedule.blocks.push(jsonBlock);
		}

		userSchedule.lunchBlock = jsonSchedule?.lunchBlock;
	} else if (schoolName === 'middleschool') {
		// Directly return JSON from middleschool schedule
		userSchedule = middleschoolSchedule[grade as 8 | 7 | 6 | 5][ // TO DO Refactor this shit
			`${day.toUpperCase()}day` as Days
		][lateStart ? 'lateStart' : 'regular'] ?? {
			blocks: [],
			lunchBlock: null
		};
		userSchedule.lunchBlock =
			middleschoolSchedule[grade as 8 | 7 | 6 | 5][`${day.toUpperCase()}day` as Days][
				lateStart ? 'lateStart' : 'regular'
			]?.lunchBlock;
	}

	// Copy the JSON so we don't modify the original reference
	userSchedule = JSON.parse(JSON.stringify(userSchedule)) as BlockFormats;

	// If date isn't null, set times relative to date object
	if (date && userSchedule) {
		for (const schedule of userSchedule.blocks) {
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
	regular: BlockFormats;
	lateStart?: BlockFormats;
}

export interface BlockFormats {
	lunchBlock?: Block | null;
	blocks: BlockFormat[];
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
	aemsh?: boolean; // Arts, English, Math, Study Hall
	hswl?: boolean; // History, Science, World Language
	default?: boolean;
}

export { getSchedule as get };
