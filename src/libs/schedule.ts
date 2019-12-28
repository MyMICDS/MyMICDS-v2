import { Block, ClassType, GetScheduleResponse, ScheduleClass } from '@mymicds/sdk';
import moment from 'moment';
import { Db } from 'mongodb';
import prisma from 'prisma';
import * as _ from 'underscore';
import * as aliases from './aliases';
import { BlockFormat, LunchBlockFormat } from './blockSchedule';
import * as blockSchedule from './blockSchedule';
import * as classes from './classes';
import * as feeds from './feeds';
import { PortalCacheEvent } from './portal';
import * as portal from './portal';
import * as users from './users';
import { StringDict } from './utils';

// Mappings for default blocks

const defaultSchoolBlock: ScheduleClass = {
	name: 'School',
	teacher: {
		prefix: 'Ms.',
		firstName: 'Lisa',
		lastName: 'Lyle'
	},
	block: Block.OTHER,
	type: ClassType.OTHER,
	color: '#A5001E',
	textDark: prisma.shouldTextBeDark('#A5001E')
};

const genericBlocks: Record<
	'activities' | 'advisory' | 'collaborative' | 'community' | 'enrichment' | 'flex' | 'lunch' | 'recess' | 'pe',
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
	enrichment: {
		name: 'Enrichment',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: ClassType.OTHER,
		block: Block.OTHER,
		color: '#FF4500',
		textDark: prisma.shouldTextBeDark('#FF4500')
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
 * Retrieves a user's schedule for the given date.
 * @param db Database connection.
 * @param user Username.
 * @param date The date to get the schedule for.
 * @param portalBroke Whether or not the Portal should be used for calculating schedules. Used internally for recursion.
 * @returns An object containing the day rotation, whether the schedule is special,
 * 			and the different classes for the day.
 */
async function getSchedule(db: Db, user: string, date: Date, portalBroke = false) {
	const scheduleDate = moment(date).startOf('day');
	const scheduleNextDay = scheduleDate.clone().add(1, 'day');

	const scheduleDay = await portal.getDayRotation(scheduleDate.toDate());

	const { isUser, userDoc } = await users.get(db, user || '');

	// Determine when school should start and end for a default schedule
	let lateStart = false;
	let defaultStart: moment.Moment;
	if (scheduleDate.day() !== 3) {
		// Not Wednesday, school starts at 8
		defaultStart = scheduleDate.clone().hour(8);
	} else {
		// Wednesday, school starts at 9
		defaultStart = scheduleDate.clone().hour(9);
		lateStart = true;
	}
	const defaultEnd = scheduleDate.clone().hour(15).minute(15);

	const defaultClasses: ScheduleClasses = [{
		class: defaultSchoolBlock,
		start: defaultStart,
		end: defaultEnd
	}];

	// If it isn't a user OR it's a teacher with no Portal URL
	if (!isUser || (userDoc!.gradYear === null && typeof userDoc!.portalURLClasses !== 'string')) {
		// Fallback to default schedule if user is invalid
		// tslint:disable-next-line:no-shadowed-variable
		const schedule: FullSchedule = {
			day: scheduleDay,
			special: false,
			classes: [],
			allDay: []
		};

		if (scheduleDay) {
			schedule.classes = defaultClasses;
		}

		return { hasURL: false, schedule };
	}

	if (portalBroke || typeof userDoc!.portalURLClasses !== 'string') {
		// If user is logged in, but hasn't configured their Portal URL
		// We would know their grade, and therefore their generic block schedule, as well as any classes they configured
		const theClasses = await classes.get(db, user);

		// Assign each class to it's block
		const blocks = JSON.parse(JSON.stringify(genericBlocks));
		// const blockTypeMap = {};
		for (const block of theClasses) {
			blocks[block.block] = block; // Very descriptive
			// blockTypeMap[block.block] = block.type;
		}

		// tslint:disable-next-line:no-shadowed-variable
		const schedule: FullSchedule = {
			day: scheduleDay,
			special: false,
			classes: [],
			allDay: []
		};

		// Look up Block Schedule for user
		// tslint:disable-next-line:no-shadowed-variable max-line-length
		const daySchedule = blockSchedule.get(scheduleDate, users.gradYearToGrade(userDoc!.gradYear!)!, scheduleDay!, lateStart);

		// Only combine with block schedule if the block schedule exists
		if (!daySchedule) { return { hasURL: false, schedule }; }

		// Insert any possible classes the user as configured in Settings
		schedule.classes = combineClassesSchedule(scheduleDate, daySchedule, blocks);
		return { hasURL: false, schedule };
	}

	// The user is logged in and has configured their Portal URL
	// We can therefore overlay their Portal classes ontop of their default block schedule for 100% coverage.
	const [aliasesResult, portalClassesResult, portalCalendarResult] = await Promise.all([
		// Get Portal aliases and their class objects
		aliases.mapList(db, user),
		// Get Portal classes feed
		portal.getFromCacheClasses(db, user).then(async ({ hasURL, events: cal }) => {
			if (_.isEmpty(cal)) {
				const events = await feeds.addPortalQueueClasses(db, user);

				if (_.isEmpty(events)) {
					// If it still returns empty, then Portal isn't working at the moment and we can fall back on not having a URL.
					return getSchedule(db, user, date, true);
				} else {
					return { hasURL, cal: events };
				}
			} else {
				return { hasURL, cal };
			}
		}),
		// Get Portal calendar feed
		portal.getFromCacheCalendar(db, user).then(async ({ hasURL, events: cal }) => {
			if (_.isEmpty(cal)) {
				const events = await feeds.addPortalQueueCalendar(db, user);

				if (_.isEmpty(events)) {
					// If it still returns empty, then Portal isn't working at the moment and we can fall back on not having a URL.
					return getSchedule(db, user, date, true);
				} else {
					return { hasURL, cal: events };
				}
			} else {
				return { hasURL, cal };
			}
		})
	]);

	let portalSchedule: ScheduleClasses = [];
	const schedule: FullSchedule = {
		day: scheduleDay,
		special: false,
		classes: [],
		allDay: []
	};

	// Default events that occur for everyone throughout the school
	// (In the non-personal calendar feed. Usually this is special schedule stuff or assembly)
	const schoolScheduleEvents = [];

	// Go through all the events in the Portal calendar
	for (const calEvent of Object.values((portalCalendarResult as any).cal as PortalCacheEvent[])) {
		const start = moment(calEvent.start);
		const end = moment(calEvent.end);

		// Make sure the event isn't all whacky
		if (end.isBefore(start)) {
			continue;
		}

		// Check if event occurs on specified day
		if (scheduleDate.isSame(start, 'day')) {
			// Check if special schedule
			const lowercaseSummary = calEvent.summary!.toLowerCase();
			if (lowercaseSummary.includes('special') && lowercaseSummary.includes('schedule')) {
				schedule.special = true;
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
		if (start.isSameOrBefore(scheduleDate) && end.isSameOrAfter(scheduleNextDay)) {
			schedule.allDay.push(portal.cleanUp(calEvent.summary!));
		}
	}

	// Go through all the events in the Portal classes
	for (const calEvent of Object.values((portalClassesResult as any).cal as PortalCacheEvent[])) {
		const start = moment(calEvent.start);
		const end = moment(calEvent.end);

		// Make sure the event isn't all whacky
		if (end.isBefore(start)) { continue; }

		// Check if it's an all-day event
		if (start.isSameOrBefore(scheduleDate) && !end.isValid()) {
			// // Check if special schedule
			// const lowercaseSummary = calEvent.summary.toLowerCase();
			// if(lowercaseSummary.includes('special') && lowercaseSummary.includes('schedule')) {
			// 	schedule.special = true;
			// 	continue;
			// }
			// Push event to all-day events
			schedule.allDay.push(portal.cleanUp(calEvent.summary!));
		} else if (start.isAfter(scheduleDate) && end.isBefore(scheduleNextDay)) {
			// See if it's part of the schedule

			// We should use the Portal class's alias; otherwise, we should fallback to a default class object. [sp1a]
			if (typeof aliasesResult.portal[calEvent.summary!] !== 'object') {

				// Determine block
				const blockPart = _.last(calEvent.summary!.match(portal.portalSummaryBlock)!);
				let block = Block.OTHER;

				if (blockPart) {
					block = _.last(blockPart.match(/[A-G]/g)!)!.toLowerCase() as Block;
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

	portalSchedule = ordineSchedule([], portalSchedule) as ScheduleClasses;

	// If special schedule, just use default portal schedule
	if (schedule.special) {
		schedule.classes = portalSchedule;
		return { hasURL: true, schedule };
	}

	// tslint:disable-next-line:max-line-length
	const daySchedule = blockSchedule.get(scheduleDate, users.gradYearToGrade(userDoc!.gradYear)!, schedule.day!, lateStart);

	// If schedule is null for some reason, default back to portal schedule
	if (daySchedule === null) {
		schedule.classes = portalSchedule;
	} else {
		// Keep track of original start and end of blocks detecting overlap
		for (const block of daySchedule) {
			if ((block as LunchBlockFormat).noOverlapAddBlocks) {
				(block as any).originalStart = block.start;
				(block as any).originalEnd = block.end;
			}
		}

		// Overlap Portal classes over default
		schedule.classes = ordineSchedule(daySchedule, portalSchedule);

		// Loop through all the blocks. If a block has a `noOverlapAddBlocks` property
		// and the current start and end times are the same as the original, add the
		// block(s) specified. This is used for inserting the free period for people
		// whose free period that determines their lunch.

		// People with free period always have first lunch. Since free periods don't
		// show up on the portal, there's no overlap from a portal class which
		// determines if they have first or second lunch; therefore, we must add it
		// ourselves.
		for (const block of schedule.classes) {
			if ((block as any).noOverlapAddBlocks) {
				// If no overlap, add blocks
				if ((block as any).originalStart === block.start && (block as any).originalEnd === block.end) {

					// Before combining blocks to existing schedule, convert to moment objects
					for (const addBlock of (block as any).noOverlapAddBlocks) {
						const startTime = addBlock.start.split(':');
						addBlock.start = scheduleDate.clone().hour(startTime[0]).minute(startTime[1]);

						const endTime = addBlock.end.split(':');
						addBlock.end = scheduleDate.clone().hour(endTime[0]).minute(endTime[1]);
					}

					schedule.classes = ordineSchedule(schedule.classes, (block as any).noOverlapAddBlocks);
				}
				delete (block as any).originalStart;
				delete (block as any).originalEnd;
			}
		}

		// Check for any blocks in the schedule that have the `block` property. This means it's directly from the
		// schedule JSON. See if there's any pre-configured classes we should insert instead, otherwise do our best
		// to make a formatted MyMICDS class object.
		for (let i = 0; i < schedule.classes.length; i++) {
			const scheduleClass = schedule.classes[i];

			if ((scheduleClass as BlockFormat).block) {
				const block = (scheduleClass as BlockFormat).block;

				// It's a class from the block schedule. Create a class object for it
				if (typeof ((genericBlocks as StringDict)[block]) === 'object') {
					(scheduleClass as any).class = (genericBlocks as StringDict)[block];
				} else {
					const blockName = 'Block ' + block[0].toUpperCase() + block.slice(1);
					const color = prisma(block).hex;
					(scheduleClass as any).class = {
						name: blockName,
						teacher: {
							prefix: '',
							firstName: '',
							lastName: ''
						},
						type: 'other',
						block,
						color,
						textDark: prisma.shouldTextBeDark(color)
					};
				}
			}

			schedule.classes[i] = {
				class: (scheduleClass as any).class as ScheduleClass,
				start: scheduleClass.start as moment.Moment,
				end: scheduleClass.end as moment.Moment
			};
		}
	}

	return { hasURL: true, schedule };
}

/**
 * Combines configured classes with a block schedule.
 * @param date Date object to get block schedule for.
 * @param schedule Block schedule.
 * @param blocks An object pairing blocks with class objects.
 * @returns An array containing the block schedule with possibly configured classes.
 */
// tslint:disable-next-line:max-line-length
function combineClassesSchedule(date: Date | moment.Moment, schedule: BlockFormat[], blocks: Partial<Record<Block, ScheduleClass>>) {
	// TODO: Is this still needed? Looks like something left behind after a refactor.
	// noinspection JSUnusedAssignment
	date = moment(date);
	if (!_.isArray(schedule)) { schedule = []; }
	if (typeof blocks !== 'object') { blocks = {}; }

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

		// Check if we should also be adding lunch
		if ((blockObject as any).includeLunch) {
			scheduleClass.name += ' + Lunch!';
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
 * Combines the two classes and orders them properly.
 * @param baseSchedule The existing classes.
 * @param addClasses The new blocks to add. Will override base classes if there is a conflict.
 * @returns A sorted array of classes.
 */
function ordineSchedule(baseSchedule: ClassesOrBlocks, addClasses: ClassesOrBlocks): ClassesOrBlocks {
	if (!_.isArray(baseSchedule)) { baseSchedule = []; }
	if (!_.isArray(addClasses)) { addClasses = []; }

	// Add each class to the base schedule
	for (const addClass of addClasses) {
		const start = moment(addClass.start);
		const end   = moment(addClass.end);

		// Keep track of conflicting indexes
		const conflictIndexes: number[] = [];

		// Move other (if any) events with conflicting times
		for (let i = 0; i < baseSchedule.length; i++) {
			const scheduleClass = baseSchedule[i];

			const blockStart = moment(scheduleClass.start);
			const blockEnd   = moment(scheduleClass.end);
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
			if (startRelation === 'same end' || startRelation === 'after') { continue; }
			if (endRelation === 'same start' || endRelation === 'before') { continue; }

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
	(baseSchedule as any[]).sort((a, b) => (a.start as any) - (b.start as any));

	return baseSchedule;
}

export interface FullSchedule {
	day: number | null;
	special: boolean;
	classes: ClassesOrBlocks;
	allDay: string[];
}

export type ClassesOrBlocks = ScheduleClasses | BlockFormat[];

export type ScheduleClasses = GetScheduleResponse['schedule']['classes'];

export {
	getSchedule as get,
	ordineSchedule as ordine
};
