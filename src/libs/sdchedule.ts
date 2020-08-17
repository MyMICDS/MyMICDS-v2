import { Block, ClassType, GetScheduleResponse, ScheduleClass } from '@mymicds/sdk';
import { Db } from 'mongodb';
import { StringDict } from './utils';
import * as _ from 'lodash';
import * as aliases from './aliases';
import * as blockSchedule from './blockSchedule';
import * as classes from './classes';
import * as feeds from './feeds';
import * as portal from './portal';
import * as users from './users';
import moment from 'moment';
import prisma from 'prisma';

import lateStarts from '../schedules/2020/late_starts.json';

export const defaultSchoolBlock: ScheduleClass = {
	name: 'School',
	teacher: {
		prefix: 'Mr.',
		firstName: 'Jay',
		lastName: 'Rainey'
	},
	block: Block.OTHER,
	type: ClassType.OTHER,
	color: '#A5001E',
	textDark: prisma.shouldTextBeDark('#A5001E')
};

const genericBlocks: Record<
	'activities' | 'advisory' | 'collaborative' | 'community' | 'flex' | 'lunch' | 'recess' | 'pe',
	ScheduleClass
> = {
	activities: {
		name: 'Activities',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: ClassType.OTHER,
		block: Block.OTHER,
		color: '#FF6347',
		textDark: prisma.shouldTextBeDark('#FF6347')
	},
	advisory: {
		name: 'Advisory',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: ClassType.OTHER,
		block: Block.OTHER,
		color: '#5a98ec',
		textDark: prisma.shouldTextBeDark('#5a98ec')
	},
	collaborative: {
		name: 'Collaborative Work',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: ClassType.OTHER,
		block: Block.OTHER,
		color: '#29ABE2',
		textDark: prisma.shouldTextBeDark('#29ABE2')
	},
	community: {
		name: 'Community',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: ClassType.OTHER,
		block: Block.OTHER,
		color: '#AA0031',
		textDark: prisma.shouldTextBeDark('#AA0031')
	},
	flex: {
		name: 'Flex',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: ClassType.OTHER,
		block: Block.OTHER,
		color: '#CC33FF',
		textDark: prisma.shouldTextBeDark('#CC33FF')
	},
	lunch: {
		name: 'Lunch!',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: ClassType.OTHER,
		block: Block.OTHER,
		color: '#116C53',
		textDark: prisma.shouldTextBeDark('#116C53')
	},
	recess: {
		name: 'Recess',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: ClassType.OTHER,
		block: Block.OTHER,
		color: '#FFFF00',
		textDark: prisma.shouldTextBeDark('#FFFF00')
	},
	pe: {
		name: 'Physical Education',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: ClassType.OTHER,
		block: Block.OTHER,
		color: '#91E11D',
		textDark: prisma.shouldTextBeDark('#91E11D')
	}
};

function isOnLateStartList(date: Date) {
	const lateStartList = lateStarts as DateList;
	lateStartList.date.forEach(value => {
		const lateStartMoment = moment(value, 'MM/DD/YYYY');
		if (moment(date).isSame(lateStartMoment)) {
			return true;
		}
	});

	return false;
}

/**
 * Retrieves a user's schedule for the given date.
 * @param db Database connection.
 * @param user Username.
 * @param date The date to get the schedule for.
 * @param isPortalBroken Whether or not the Portal should be used for calculating schedules. Used internally for recursion.
 * @returns An object containing the day rotation, whether the schedule is special,
 * 			and the different classes for the day.
 */

async function getSchedule(
	db: Db,
	user: string,
	date: Date,
	isPortalBroken = false
): Promise<{ hasURL: boolean; schedule: FullSchedule }> {
	const requestedDate = moment(date).startOf('day');
	const requestedDateNextDay = requestedDate.clone().add(1, 'day');

	const scheduleDay = await portal.getDayRotation(requestedDate.toDate());

	const { isUser, userDoc } = await users.get(db, user || '');

	// Determine when school should start and end for a default schedule
	let lateStart = false;
	let defaultStart: moment.Moment;
	const defaultEnd = requestedDate.clone().hour(15).minute(15);

	if ((await portal.isLateStart(date)) || isOnLateStartList(date)) {
		// Wednesday, school starts at 9
		defaultStart = requestedDate.clone().hour(9);
		lateStart = true;
	} else {
		// Not Wednesday, school starts at 8
		// defaultStart = scheduleDate.clone().hour(8);
		defaultStart = requestedDate.clone().hour(8).minute(30); // COVID class start
	}

	// create schedule (this function is a pancake, it adds data on top)
	let userSchedule: FullSchedule = {
		day: scheduleDay,
		special: false,
		classes: [],
		allDay: []
	};

	// We already set up everything possible if the user is not valid, or a teacher with no portal URL set up.
	if (!isUser || (userDoc!.gradYear === null && typeof userDoc!.portalURLClasses !== 'string')) {
		// Fallback to default schedule

		if (scheduleDay) {
			userSchedule.classes = [
				{
					class: defaultSchoolBlock,
					start: defaultStart,
					end: defaultEnd
				}
			];
		}

		return { hasURL: false, schedule: userSchedule };
	}

	// we now know that user is logged in
	const dayBlockSchedule = blockSchedule.get(
		requestedDate,
		users.gradYearToGrade(userDoc!.gradYear),
		scheduleDay,
		lateStart
	);

	if (!dayBlockSchedule) {
		return { hasURL: true, schedule: userSchedule };
	}

	// add configured classes
	const configuredClasses = await classes.get(db, user);

	// Assign each class to it's block
	const blocks = JSON.parse(JSON.stringify(genericBlocks));

	// This assigns the configured class to it's correct block letter.
	for (const blockClass of configuredClasses) {
		blocks[blockClass.block] = blockClass; // Very descriptive <- Comments like those are unhelpful. *cough*.
	}

	// combine everything
	userSchedule.classes = combineClassesSchedule(requestedDate, dayBlockSchedule, blocks);

	// if there is no portal URL, we can stop here
	if (isPortalBroken || typeof userDoc!.portalURLClasses !== 'string') {
		return { hasURL: true, schedule: userSchedule };
	}

	// get aliases and portal stuff
	const [aliasesResult, portalClassesResult, portalCalendarResult] = await Promise.all([
		// Get Portal aliases and their class objects
		aliases.mapList(db, user),
		// Get Portal classes feed
		portal.getFromCacheClasses(db, user).then(async ({ hasURL, events: cal }) => {
			if (_.isEmpty(cal)) {
				const events = await feeds.addPortalQueueClasses(db, user);

				if (_.isEmpty(events)) {
					return null;
				}
				return { hasURL, cal: events };
			}
			return { hasURL, cal };
		}),
		// Get Portal calendar feed
		portal.getFromCacheCalendar(db, user).then(async ({ hasURL, events: cal }) => {
			if (hasURL && _.isEmpty(cal)) {
				const events = await feeds.addPortalQueueCalendar(db, user);

				if (_.isEmpty(events)) {
					return null;
				}
				return { hasURL, cal: events };
			}
			return { hasURL, cal };
		})
	] as const);

	if (!(portalClassesResult && portalCalendarResult)) {
		// If it still returns empty, then Portal isn't working at the moment and we can fall back on not having a URL.
		return getSchedule(db, user, date, true);
	}

	let portalSchedule: ScheduleClasses = [];

	//schedule.classes = ordineSchedule([], schedule.classes);
	return { hasURL: true, schedule: userSchedule };
}

/**
 * Combines configured classes with a block schedule.
 * @param date Date object to get block schedule for.
 * @param schedule Block schedule.
 * @param blocks An object pairing blocks with class objects.
 * @returns An array containing the block schedule with possibly configured classes.
 */
function combineClassesSchedule(
	date: Date | moment.Moment,
	schedule: blockSchedule.BlockFormat[],
	blocks: Partial<Record<Block, ScheduleClass>>
) {
	// TODO: Is this still needed? Looks like something left behind after a refactor.
	// noinspection JSUnusedAssignment
	date = moment(date);
	if (!Array.isArray(schedule)) {
		schedule = [];
	}
	if (typeof blocks !== 'object') {
		blocks = {};
	}

	// Loop through schedule
	const combinedSchedule: ScheduleClasses = [];

	for (const blockObject of schedule) {
		// Check if user has configured a class for this block
		const block = blockObject.block;
		let scheduleClass = blocks[block];

		if (typeof scheduleClass !== 'object') {
			const blockName = 'Block ' + block[0].toUpperCase() + block.slice(1);
			const color = prisma(block).hex;
			scheduleClass = {
				name: blockName,
				teacher: {
					prefix: '',
					firstName: '',
					lastName: ''
				},
				type: ClassType.OTHER,
				block: Block.OTHER,
				color,
				textDark: prisma.shouldTextBeDark(color)
			};
		}

		combinedSchedule.push({
			class: scheduleClass,
			start: blockObject.start as moment.Moment,
			end: blockObject.end as moment.Moment
		});
	}

	JSON.stringify(combinedSchedule);
	return combinedSchedule;
}

export interface FullSchedule {
	day: string | null;
	special: boolean;
	classes: ClassesOrBlocks;
	allDay: string[];
}

interface DateList {
	date: string[];
}

export type ClassesOrBlocks = ScheduleClasses | blockSchedule.BlockFormat[];

export type ScheduleClasses = GetScheduleResponse['schedule']['classes'];

export { getSchedule as get };
