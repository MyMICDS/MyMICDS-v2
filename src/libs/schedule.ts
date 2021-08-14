import { Block, ClassType, GetScheduleResponse, ScheduleClass } from '@mymicds/sdk';
import { Db } from 'mongodb';
import * as _ from 'lodash';
import * as aliases from './aliases';
import * as blockSchedule from './blockSchedule';
import * as classes from './classes';
import * as feeds from './feeds';
import * as portal from './portal';
import * as users from './users';
import moment from 'moment';
import prisma from '@rapid7/prisma';

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

/**
 * checks if date is on the official list of late starts for the school year
 * @param date The date to check the list against
 * @returns boolean of whether the date is on the list.
 */
function isOnLateStartList(date: Date) {
	const lateStartList = lateStarts as DateList;
	for (const lateStartDate of lateStartList.date) {
		const lateStartMoment = moment(lateStartDate, 'MM/DD/YYYY');
		if (moment(date).isSame(lateStartMoment)) {
			return true;
		}
	}
	return false;
}

/**
 * removes lunch and lunch-related-class blocks with none of matching flags. That is even if it's Hswl, and keep Hswl is false, BUT it has the default
 * flag and keepDefault is true, that block will NOT be removed.
 * @param daySchedule the block schedule for the day
 * @param keepMash whether to keep lunch and lunch-related-class blocks with the Aemsh flag in the schedule
 * @param keepHiswl ditto for above but for Hswl
 * @param keepEnsci ditto for above but for Ensci
 * @param keepDefault ditto but for default flags; this comes in handy when the user has no portal URL
 * @returns daySchedule, but with all the
 */
function removeCertainLunchBlocks(
	daySchedule: blockSchedule.BlockFormats,
	{ keepMash = true, keepHiswl = true, keepEnsci = true, keepDefault = true }
) {
	for (let index = 0; index < daySchedule.blocks.length; index++) {
		const val = daySchedule.blocks[index] as blockSchedule.LunchBlockFormat;
		const isLunchBlock = val.ensci || val.hiswl || val.mash;
		if (!isLunchBlock) {
			continue;
		}

		if (
			(keepMash && (val.mash ?? false)) ||
			(keepHiswl && (val.hiswl ?? false)) ||
			(keepEnsci && (val.ensci ?? false)) ||
			(keepDefault && (val.default ?? false))
		) {
			continue;
		}

		daySchedule.blocks.splice(index, 1);
		index -= 1;
	}
	return daySchedule;
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
		// school starts at 9 for late starts
		defaultStart = requestedDate.clone().hour(9);
		lateStart = true;
	} else {
		// Not Wednesday, school starts at 8
		defaultStart = requestedDate.clone().hour(8);
	}

	// create schedule (this function is a pancake, it adds data on top)
	const userSchedule: FullSchedule = {
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
	let dayBlockSchedule = blockSchedule.get(
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
		blocks[blockClass.block] = blockClass;
	}

	// combine everything
	userSchedule.classes = combineClassesSchedule(requestedDate, dayBlockSchedule.blocks, blocks);

	// if there is no portal URL, we have to remove weird lunch block stuff by using defaults and some guessing, and then we can return
	// TODO add defaults for short days (wait for COVID classes to end... if they ever end)
	if (isPortalBroken || typeof userDoc!.portalURLClasses !== 'string') {
		dayBlockSchedule = removeCertainLunchBlocks(dayBlockSchedule, {
			keepEnsci: false,
			keepHiswl: false,
			keepMash: lateStart
		});
		userSchedule.classes = combineClassesSchedule(
			requestedDate,
			dayBlockSchedule.blocks,
			blocks
		);
		return { hasURL: false, schedule: userSchedule };
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

	const schoolScheduleEvents = [];
	// This is useful for detecting special schedules
	// TODO, rewrite code block to detect for massive misalignments and fallback to special schedule.

	if (portalCalendarResult.hasURL && portalCalendarResult.cal) {
		// Go through all the events in the Portal calendar
		for (const calEvent of Object.values(
			portalCalendarResult.cal as portal.PortalCacheEvent[]
		)) {
			const start = moment(calEvent.start);
			const end = moment(calEvent.end);

			// It doesn't make any sense for end to come before start
			// But I guess it's theoretically possible so we should check for it
			// Additionally, if `calevent.end` is undefined, moment will fallback to the current time/day
			// Therefore, we must also check that `calEvent.end` is not undefined.
			if (end.isBefore(start) && calEvent.end) {
				continue;
			}

			// Check if event occurs on specified day
			if (requestedDate.isSame(start, 'day')) {
				// Check if special schedule
				const lowercaseSummary = calEvent.summary!.toLowerCase();
				if (
					lowercaseSummary.includes('special') ||
					lowercaseSummary.includes('us ss') ||
					lowercaseSummary.includes('modified')
				) {
					userSchedule.special = true;
					continue;
				}

				// Check if event occurs throughout school day
				if (start.isSameOrAfter(defaultStart) && end.isSameOrBefore(defaultEnd)) {
					const color = prisma(calEvent.summary).hex;
					schoolScheduleEvents.push({
						start,
						end,
						class: {
							portal: true,
							name: calEvent.summary,
							teacher: {
								prefix: '',
								firstName: '',
								lastName: ''
							},
							block: 'other',
							type: 'other',
							color,
							textDark: prisma.shouldTextBeDark(color)
						}
					});
				}
			}
			// Check if it's an all-day event
			// @TODO Don't know if this works (if everything we'd consider "all-day" event actually matches this criteria)
			if (start.isSameOrBefore(requestedDate) && end.isSameOrAfter(requestedDateNextDay)) {
				userSchedule.allDay.push(portal.cleanUp(calEvent.summary!));
			}
		}
	}

	const portalSchedule: ScheduleClasses = [];

	// Go through ALL the events in the Portal classes
	for (const calEvent of Object.values(portalClassesResult.cal as portal.PortalCacheEvent[])) {
		const start = moment(calEvent.start);
		const end = moment(calEvent.end);

		// make sure event doesn't break the 4th dimension and end before it starts
		if (end.isBefore(start)) {
			continue;
		}

		// Check if it's an all-day event
		if (start.isSameOrBefore(requestedDate) && !end.isValid()) {
			// Push event to all-day events
			userSchedule.allDay.push(portal.cleanUp(calEvent.summary!));
		} else if (start.isAfter(requestedDate) && end.isBefore(requestedDateNextDay)) {
			// We should use the Portal class's alias; otherwise, we should fallback to a default class object. [sp1a]
			if (!(calEvent.summary! in aliasesResult.portal)) {
				// Determine block
				// eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
				const blockPart = _.last(calEvent.summary!.match(portal.portalSummaryBlock));
				let block = Block.OTHER;

				if (blockPart) {
					block = _.last(blockPart.match(/[A-H]/g))!.toLowerCase() as Block;
				}

				// Generate random color
				const color = prisma(calEvent.summary).hex;

				// RegEx for determining block and stuff is a bit intense; therefore, we should cache it. [sp1a]
				aliasesResult.portal[calEvent.summary!] = {
					portal: true,
					name: portal.cleanUp(calEvent.summary!),
					teacher: {
						prefix: '',
						firstName: '',
						lastName: ''
					},
					block,
					type: ClassType.OTHER,
					color,
					textDark: prisma.shouldTextBeDark(color)
				};
			}

			// Add block into Portal Schedule array
			portalSchedule.push({
				class: aliasesResult.portal[calEvent.summary!] as ScheduleClass,
				start,
				end
			});
		}
	}

	// remove incorrect lunch blocks (loop through all blocks, do some logic, and remove incorrect lunch blocks)
	for (const block of dayBlockSchedule.blocks) {
		if (block.block !== dayBlockSchedule.lunchBlock) {
			continue;
		}

		const lunchBlock = block as blockSchedule.LunchBlockFormat;
		const portalLunchBlock = portalSchedule.find(portalBlock => {
			return portalBlock.class.block === block.block;
		});

		// I need to convert the strings to Moment Objects
		lunchBlock.start = convertTimeStringToMoment(requestedDate, lunchBlock.start);
		lunchBlock.end = convertTimeStringToMoment(requestedDate, lunchBlock.end);

		// see which class the portal matches with
		const isEnsci = lunchBlock.ensci ?? false;
		const isHiswl = lunchBlock.hiswl ?? false;
		const isMash = lunchBlock.mash ?? false;
		if (isEnsci || isHiswl || isMash) {
			const matches =
				lunchBlock.start.isSame(portalLunchBlock?.start) &&
				lunchBlock.end.isSame(portalLunchBlock?.end);
			if (matches) {
				dayBlockSchedule = removeCertainLunchBlocks(dayBlockSchedule, {
					keepMash: isMash,
					keepHiswl: isHiswl,
					keepEnsci: isEnsci,
					keepDefault: false
				});
			}
		} else {
			continue;
		}
		userSchedule.classes = combineClassesSchedule(
			requestedDate,
			dayBlockSchedule.blocks,
			blocks
		);
	}

	// organize the block schedule just in case
	userSchedule.classes = ordineSchedule([], userSchedule.classes);

	if (userSchedule.special) {
		userSchedule.classes = ordineSchedule([], portalSchedule);
		return { hasURL: true, schedule: userSchedule };
	}

	// overlay portal now that we're ready, and now we know the schedule isn't special
	userSchedule.classes = ordineSchedule(userSchedule.classes, portalSchedule);

	return { hasURL: true, schedule: userSchedule };
}

/**
 * converts a time string in the format hh:mm to a moment object, and append that time to the date Moment object
 * @param date the day to append the time to.
 * @param time this is the time string in hh:mm, it will take a moment object to, but will result in no changes.
 * @returns Moment object of the same date, but with the time set to the time string's value.
 */
function convertTimeStringToMoment(
	date: moment.Moment,
	time: moment.Moment | string
): moment.Moment {
	if (typeof time === 'string') {
		return date
			.clone()
			.hour(parseInt(time.split(':')[0], 10))
			.minute(parseInt(time.split(':')[1], 10));
	}
	return time;
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

/**
 * --------------------------------
 * or·dine
 * ôrdīn
 * verb
 *
 * 1. To order and combine
 *
 * - Michael Gira.
 * --------------------------------
 * Combines the two classes and orders them properly.
 * @param baseSchedule The existing classes.
 * @param addClasses The new blocks to add. Will override base classes if there is a conflict.
 * @returns A sorted array of classes.
 */
function ordineSchedule(
	baseSchedule: ClassesOrBlocks,
	addClasses: ClassesOrBlocks
): ClassesOrBlocks {
	if (!Array.isArray(baseSchedule)) {
		baseSchedule = [];
	}
	if (!Array.isArray(addClasses)) {
		addClasses = [];
	}

	// Add each class to the base schedule
	for (const addClass of addClasses) {
		const start = moment(addClass.start);
		const end = moment(addClass.end);

		// Keep track of conflicting indexes
		const conflictIndexes: number[] = [];

		// Move other (if any) events with conflicting times
		for (let i = 0; i < baseSchedule.length; i++) {
			const scheduleClass = baseSchedule[i];

			const blockStart = moment(scheduleClass.start);
			const blockEnd = moment(scheduleClass.end);
			// Determine start/end times relative to the class we're currently trying to add
			let startRelation = null;
			if (start.isSame(blockStart)) {
				startRelation = 'same start';
			} else if (start.isSame(blockEnd)) {
				startRelation = 'same end';
			} else if (start.isBefore(blockStart)) {
				startRelation = 'before';
			} else if (start.isAfter(blockEnd)) {
				startRelation = 'after';
			} else if (start.isAfter(blockStart) && start.isBefore(blockEnd)) {
				startRelation = 'inside';
			}

			let endRelation = null;
			if (end.isSame(blockStart)) {
				endRelation = 'same start';
			} else if (end.isSame(blockEnd)) {
				endRelation = 'same end';
			} else if (end.isBefore(blockStart)) {
				endRelation = 'before';
			} else if (end.isAfter(blockEnd)) {
				endRelation = 'after';
			} else if (end.isAfter(blockStart) && end.isBefore(blockEnd)) {
				endRelation = 'inside';
			}

			// If new event is totally unrelated to the block, just ignore
			if (startRelation === 'same end' || startRelation === 'after') {
				continue;
			}
			if (endRelation === 'same start' || endRelation === 'before') {
				continue;
			}

			// If start is before or equal to block start
			if (startRelation === 'before' || startRelation === 'same start') {
				// If end is inside, we can still keep half of the block
				if (endRelation === 'inside') {
					baseSchedule[i].start = end.clone();
				}

				// If new class completely engulfs the block, delete
				if (endRelation === 'same end' || endRelation === 'after') {
					// Only push to array if index isn't already in array
					if (!conflictIndexes.includes(i)) {
						conflictIndexes.push(i);
					}
				}
			}

			// If end is inside the block
			if (startRelation === 'inside') {
				// If new event is inside block
				if (endRelation === 'inside') {
					// Split event into two
					const newBlock = JSON.parse(JSON.stringify(scheduleClass));

					// Set old block to beginning of next block
					baseSchedule[i].end = start.clone();
					// Set new block start where the next block left off
					newBlock.start = end.clone();
					// Also make sure end is a moment object because it goes through JSON.stringify
					newBlock.end = moment(newBlock.end);

					baseSchedule.push(newBlock);
				}

				if (endRelation === 'same end' || endRelation === 'after') {
					baseSchedule[i].end = start.clone();
				}
			}

			// If same times, delete
			if (startRelation === 'same start' && endRelation === 'same end') {
				// Only push to array if index isn't already in array
				if (!conflictIndexes.includes(i)) {
					conflictIndexes.push(i);
				}
			}
		}

		// Delete all conflicting classes
		conflictIndexes.sort();
		let deleteOffset = 0;
		for (const conflictIndex of conflictIndexes) {
			const index = conflictIndex - deleteOffset++;
			baseSchedule.splice(index, 1);
		}

		// After all other classes are accounted for, add this new class
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(baseSchedule as any[]).push(addClass);
	}

	// TypeScript is being really fussy about baseSchedule
	// Fixing the types is non-trivial though so just do some any stuff rn

	// Delete all classes that start and end at the same time, or end is before start
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	baseSchedule = (baseSchedule as any[]).filter(value => value.start.unix() < value.end.unix());

	// Reorder schedule because of deleted classes
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(baseSchedule as any[]).sort((a, b) => a.start - b.start);

	return baseSchedule;
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

export { getSchedule as get, ordineSchedule as ordine };
