import { Block, ClassType, GetScheduleResponse, ScheduleClass, ScheduleBlock } from '@mymicds/sdk';
import { Db } from 'mongodb';
import { StringDict } from './utils';
import * as _ from 'lodash';
import * as aliases from './aliases';
import * as blockSchedule from './blockSchedule';
import * as classes from './classes';
import * as feeds from './feeds';
import * as portal from './portal';
import * as users from './users';
import moment, { Moment } from 'moment';
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
	userSchedule.classes = combineClassesSchedule(requestedDate, dayBlockSchedule.blocks, blocks);

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

	const schoolScheduleEvents = [];

	if (portalCalendarResult.hasURL && portalCalendarResult.cal) {
		// Go through all the events in the Portal calendar
		for (const calEvent of Object.values(
			portalCalendarResult.cal as portal.PortalCacheEvent[]
		)) {
			const start = moment(calEvent.start);
			const end = moment(calEvent.end);

			// It doesn't make any sense for end to come before start
			// But I guess it's theoretically possible so we should check for it
			if (end.isBefore(start)) {
				continue;
			}

			// Check if event occurs on specified day
			if (requestedDate.isSame(start, 'day')) {
				// Check if special schedule
				const lowercaseSummary = calEvent.summary!.toLowerCase();
				if (
					lowercaseSummary.includes('special') ||
					lowercaseSummary.includes('ss') ||
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

		// make sure event doesn't violate the 4th dimension and end before it starts
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

	// before combining our block and portal schedules, we need to resize the lunch

	//create lunch block (edited as needed)
	const newLunchBlock: ScheduleBlock = {
		class: genericBlocks['lunch'],
		start: requestedDate.clone(),
		end: requestedDate.clone()
	};

	for (const block of dayBlockSchedule.blocks) {
		if (block.block !== dayBlockSchedule.lunchBlock) {
			continue;
		}

		const lunchBlock = block as blockSchedule.LunchBlockFormat;
		const portalLunchBlock = portalSchedule.find(portalBlock => {
			return portalBlock.class.block === block.block;
		});

		const portalLunchBlockIndex = portalSchedule.findIndex(portalBlock => {
			return portalBlock.class.block === block.block;
		});

		// a bit messy, but I have to convert everything to moment objects
		lunchBlock.hswl.start = convertTimeStringToMoment(requestedDate, lunchBlock.hswl.start);
		lunchBlock.hswl.end = convertTimeStringToMoment(requestedDate, lunchBlock.hswl.end);
		lunchBlock.aemsh.start = convertTimeStringToMoment(requestedDate, lunchBlock.aemsh.start);
		lunchBlock.aemsh.end = convertTimeStringToMoment(requestedDate, lunchBlock.aemsh.end);

		// if portalLunchBlock is null, user has free, so insert first lunch.
		if (portalLunchBlock === undefined) {
			const ishswlEarlier = lunchBlock.hswl.start.isBefore(lunchBlock.hswl.end);

			newLunchBlock.start = ishswlEarlier ? lunchBlock.hswl.start : lunchBlock.aemsh.start;
			newLunchBlock.end = ishswlEarlier ? lunchBlock.hswl.end : lunchBlock.aemsh.end;
			break;
		}

		// details on time overlapping here: https://stackoverflow.com/questions/325933/determine-whether-two-date-ranges-overlap
		// slightly modified so that it can end/start at same times, but not overlap

		const hswlOverlaps =
			portalLunchBlock?.start.isSameOrAfter(lunchBlock.hswl.end) &&
			portalLunchBlock?.end.isSameOrBefore(lunchBlock.hswl.start);
		const aemshOverlaps =
			portalLunchBlock?.start.isSameOrAfter(lunchBlock.aemsh.end) &&
			portalLunchBlock?.end.isSameOrBefore(lunchBlock.aemsh.start);

		if (hswlOverlaps && aemshOverlaps) {
			portalSchedule[portalLunchBlockIndex].class.name =
				portalSchedule[portalLunchBlockIndex].class.name + ' + Lunch!';
			break;
		} else if (hswlOverlaps) {
			newLunchBlock.start = lunchBlock.aemsh.start;
			newLunchBlock.end = lunchBlock.aemsh.end;
		} else if (aemshOverlaps) {
			newLunchBlock.start = lunchBlock.hswl.start;
			newLunchBlock.end = lunchBlock.hswl.end;
		}

		// something is broken (or just a late start), declare special schedule and break
		if (lateStart) {
			// late start is special since we see which lunch period the portal overlaps with, then pick the other one as the user's lunch
			portalSchedule[portalLunchBlockIndex].class.name =
				portalSchedule[portalLunchBlockIndex].class.name + ' + Lunch!';

			const lunchBlockIndex = userSchedule.classes.findIndex(val => {
				return (
					val.class.name.toLowerCase().indexOf(dayBlockSchedule.lunchBlock ?? 'bazinga') >
					-1
				);
			});
			console.log(userSchedule.classes);
			userSchedule.classes.splice(lunchBlockIndex, 1);
			console.log(userSchedule.classes);
		} else {
			userSchedule.special = true;
			userSchedule.classes = portalSchedule;
			return { hasURL: true, schedule: userSchedule };
		}
	}

	userSchedule.classes.push(newLunchBlock);

	userSchedule.classes = ordineSchedule(userSchedule.classes, portalSchedule);

	return { hasURL: true, schedule: userSchedule };
}

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

					(baseSchedule as any[]).push(newBlock);
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
		(baseSchedule as any[]).push(addClass);
	}

	// Delete all classes that start and end at the same time, or end is before start
	baseSchedule = (baseSchedule as any[]).filter(value => value.start.unix() < value.end.unix());

	// Reorder schedule because of deleted classes
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

export { getSchedule as get };
