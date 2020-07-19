import { GetBreaksResponse } from '@mymicds/sdk';
import * as portal from './portal';
import moment from 'moment';

/**
 * Gets the day that school will start for a given year.
 * Based on two consecutive years, we have gathered enough data to conclude that
 * the last day of school is _probably_ the third Wednesday of August.
 * @param year The year containing the start of school.
 * @returns A Moment.js object with the start of school.
 */
export function thirdWednesdayAugust(year: number) {
	return moment().year(year).month('August').startOf('month').day('Wednesday').add(2, 'weeks').startOf('day').hours(8);
}

/**
 * Gets the next day that school starts.
 * @returns A Moment.js object containing the next school start date.
 */
export function schoolStarts() {
	const current = moment();
	const firstDayThisYear = thirdWednesdayAugust(current.year());

	if (firstDayThisYear.isAfter(current)) {
		return firstDayThisYear;
	} 
		return thirdWednesdayAugust(current.year() + 1);
	
}

/**
 * Gets the day that school will end for a given year.
 * Based on two consecutive years, we have gather enough data to conclude that
 * the last day of school is _probably_ the last Friday of May.
 * @param year The year containing the end of school.
 */
export function lastFridayMay(year?: number) {
	const current = moment();
	if (typeof year !== 'number' || year % 1 !== 0) {
		year = current.year();
	}

	const lastDayOfMay = moment().year(year).month('May').endOf('month').startOf('day').hours(11).minutes(30);

	/*
	 * Fun fact: This is literally the only switch statement in the whole MyMICDS codebase.
	 */

	let lastDay;
	switch (lastDayOfMay.day()) {
	case 5:
		// If day is already Friday
		lastDay = lastDayOfMay;
		break;

	case 6:
		// Last day is Sunday
		lastDay = lastDayOfMay.subtract(1, 'day');
		break;

	default:
		// Subtract day of week (which cancels it out) and start on Saturday.
		// Then subtract to days to get from Saturday to Friday.
		lastDay = lastDayOfMay.subtract(lastDayOfMay.day() + 2, 'days');
		break;
	}

	return lastDay;
}

/**
 * Gets the next day that school ends.
 * @returns A Moment.js object containing the next school end date.
 */
export function schoolEnds() {
	const current = moment();
	const lastDayThisYear = lastFridayMay(current.year());

	let day: moment.Moment;
	if (lastDayThisYear.isAfter(current)) {
		day = lastDayThisYear;
	} else {
		day = lastFridayMay(current.year() + 1);
	}

	if (day.date() === 31) {
		return day.subtract(1, 'week');
	} 
		return day;
	
}

/**
 * Gets the start and end year of school for a given date.
 * @param date Date object.
 * @returns Array of school years.
 */
export function getSchoolYear(date: Date): [number, number] {
	const dateObj = moment(date);
	const lastDayThisYear = lastFridayMay(dateObj.year());

	// If after summer, include next year. Otherwise, include last year
	if (dateObj.isAfter(lastDayThisYear)) {
		return [dateObj.year(), dateObj.year() + 1];
	} 
		return [dateObj.year() - 1, dateObj.year()];
	
}

/**
 * Gets all upcoming breaks and long weekends within the next 12 months.
 * @returns A list of Moment.js objects with all the days off.
 */
async function getDaysOff() {
	const days = await portal.getDayRotations();

	const dayPointer = moment().startOf('day').subtract(portal.portalRange.previous, 'months');
	const dayMax = moment().startOf('day').add(portal.portalRange.upcoming, 'months');

	// Array of moment.js objects which we have a day off
	const daysOff: moment.Moment[] = [];

	// Go through all days
	while (dayPointer.isSameOrBefore(dayMax)) {

		// Check if there's no rotation day and that it isn't the weekend
		if (!(days[dayPointer.year()] &&
				days[dayPointer.year()][dayPointer.month() + 1] &&
				days[dayPointer.year()][dayPointer.month() + 1][dayPointer.date()])) {
			daysOff.push(dayPointer.clone());
		}

		dayPointer.add(1, 'day');
	}

	return daysOff;
}

/**
 * Gets all breaks according to days off.
 * @returns A list of all breaks.
 */
export async function getBreaks() {
	// Get array of days that have no day rotation
	const days = await getDaysOff();

	// Group days off into arrays
	let i = 0;
	const groupedDays = days.reduce((stack, b) => {
		const cur = stack[i];
		const a = cur ? cur[cur.length - 1].valueOf() : 0;

		if (b.valueOf() - a > 86400000) {
			i++;
		}

		if (!stack[i]) {
			stack[i] = [];
		}

		stack[i].push(b);

		return stack;
	}, [] as moment.Moment[][]);
	// For some reason first element is always undefined or something
	groupedDays.shift();

	// Categorize breaks
	// Weekends - Breaks that are exclusively Saturday and Sunday
	// Long Weekends - Breaks that include Saturday and Sunday.
	// 				   Can include weekdays but cannot be more than a week (7 days).
	// Vacations - Breaks that are more than a week (7 days).
	// Other - For some reason if there's a day off in the middle of the week.

	const categorizedBreaks: GetBreaksResponse['breaks'] = {
		weekends: [],
		longWeekends: [],
		vacations: [],
		other: []
	};

	for (const group of groupedDays) {
		// Check if weekend
		if (group.length === 2 && group[0].day() === 6 && group[1].day() === 0) {
			categorizedBreaks.weekends.push({
				start: group[0],
				end: group[group.length - 1]
			});
			continue;
		}

		// Check if Saturday / Sunday are included in break
		let weekendIncluded = false;
		for (const dayObj of group) {
			if (dayObj.day() === 6 || dayObj.day() === 0) {
				weekendIncluded = true;
			}
		}

		if (weekendIncluded) {
			if (group.length < 7) {
				categorizedBreaks.longWeekends.push({
					start: group[0],
					end: group[group.length - 1]
				});
			} else {
				categorizedBreaks.vacations.push({
					start: group[0],
					end: group[group.length - 1]
				});
			}
		} else {
			categorizedBreaks.other.push({
				start: group[0],
				end: group[group.length - 1]
			});
		}

	}

	return categorizedBreaks;
}
