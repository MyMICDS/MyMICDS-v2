import { ChangeUserInfoParameters, GetUserInfoResponse, School } from '@mymicds/sdk';
import { Db, ObjectID } from 'mongodb';
import * as _ from 'lodash';
import moment from 'moment';

import * as dates from './dates';

/**
 * Gets data about a user.
 * @param db Database connection.
 * @param user Username.
 * @returns Whether the user is valid and the contents of the user document.
 */
async function getUser(db: Db, user: string) {
	const userdata = db.collection<UserDoc>('users');

	let docs: UserDoc[];
	try {
		// Query database to find possible user
		docs = await userdata.find({ user }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	let isUser = false;
	let userDoc: UserDoc | null = null;

	if (docs.length !== 0) {
		isUser = true;
		userDoc = docs[0];
	}

	return { isUser, userDoc };
}

/**
 * Retrieves basic information about a specific user.
 * @param db Database connection.
 * @param user Username.
 * @param privateInfo Whether to include more sensitive information like calendar URLs. Defaults to false.
 * @returns An object containing user information.
 */
export async function getInfo(db: Db, user: string, privateInfo: boolean) {
	const { isUser, userDoc } = await getUser(db, user);

	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	// Create userInfo object and manually move values from database.
	// We don't want something accidentally being released to user.
	const userInfo: Partial<GetUserInfoResponse> = {};
	userInfo.user      = userDoc!.user;
	userInfo.password  = 'Hunter2'; /** @TODO: Fix glitch? Shows up as ******* for me. */
	userInfo.firstName = userDoc!.firstName;
	userInfo.lastName  = userDoc!.lastName;
	userInfo.gradYear  = userDoc!.gradYear;
	userInfo.grade     = gradYearToGrade(userInfo.gradYear);
	userInfo.school    = gradeToSchool(userInfo.grade);

	if (privateInfo) {
		if (typeof userDoc!.canvasURL === 'string') {
			userInfo.canvasURL = userDoc!.canvasURL;
		} else {
			userInfo.canvasURL = null;
		}

		// Legacy Blackbaud portal URL
		if (typeof userDoc!.portalURL === 'string') {
			userInfo.portalURL = userDoc!.portalURL;
		} else {
			userInfo.portalURL = null;
		}

		// New Veracross portal URLs
		if (typeof userDoc!.portalURLClasses === 'string') {
			userInfo.portalURLClasses = userDoc!.portalURLClasses;
		} else {
			userInfo.portalURLClasses = null;
		}

		if (typeof userDoc!.portalURLCalendar === 'string') {
			userInfo.portalURLCalendar = userDoc!.portalURLCalendar;
		} else {
			userInfo.portalURLCalendar = null;
		}
	}

	userInfo.migrateToVeracross = !!userInfo.portalURL && (!userInfo.portalURLClasses || !userInfo.portalURLCalendar);

	return userInfo as GetUserInfoResponse;
}

/**
 * Changes basic user information (name, grade, etc).
 * @param db Database connection.
 * @param user Username.
 * @param info Information to change.
 */
export async function changeInfo(db: Db, user: string, info: ChangeUserInfoParameters) {
	// I mean if they want nothing changed, I guess there's no error
	if (_.isEmpty(info)) { return; }

	const { isUser, userDoc } = await getUser(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	// See what information the user wants changed
	const set: ChangeUserInfoParameters = {};

	if (typeof info.firstName === 'string') {
		set.firstName = info.firstName;
	}
	if (typeof info.lastName === 'string') {
		set.lastName = info.lastName;
	}
	if (info.gradYear === null) {
		set.gradYear = null;
	} else if (typeof info.gradYear === 'number' && info.gradYear % 1 === 0 && !Number.isNaN(info.gradYear)) {
		set.gradYear = info.gradYear;
	}

	if (_.isEmpty(set)) { return; }

	// Update data
	const userdata = db.collection('users');

	try {
		await userdata.updateOne({ _id: userDoc!._id, user }, { $set: set }, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem updating the databse!');
	}
}

/**
 * Converts a graduation year into a grade.
 * Junior and Senior Kindergarten (JK/SK) are converted to -1 and 0, respectively.
 * @param gradYear Graduation year.
 * @returns A grade number.
 */
export function gradYearToGrade(gradYear: number | null) {
	if (typeof gradYear !== 'number' || gradYear % 1 !== 0) { return null; }

	const current = moment();
	const differenceYears = current.year() - gradYear;
	let grade = 12 + differenceYears;

	// If last day of school has already passed, you comple ted a grade of school
	const schoolEnd = dates.lastFridayMay();
	if (current.isAfter(schoolEnd)) {
		grade++;
	}

	return grade;
}

/**
 * Converts a grade into a graduation year.
 * @param grade Grade number.
 * @returns A graduation year.
 */
export function gradeToGradYear(grade: number | null) {
	if (typeof grade !== 'number' || grade % 1 !== 0) { return null; }

	const current = moment();

	// If last day of school has already passed, round year down
	const schoolEnd = dates.lastFridayMay();
	if (current.isAfter(schoolEnd)) {
		grade--;
	}

	const differenceYears = grade - 12;
	return current.year() - differenceYears;
}

/**
 * Determines which school a grade number belongs to. Defaults to Upper School.
 * @param grade Grade number.
 * @returns The corresponding school.
 */
export function gradeToSchool(grade: number | null): School {
	if (typeof grade !== 'number' || grade >= 9) { return 'upperschool'; }
	if (grade < 5) { return 'lowerschool'; }
	return 'middleschool';
}

export interface UserDoc {
	_id: ObjectID;
	user: string;
	password: string;
	firstName: string;
	lastName: string;
	gradYear: number | null;
	confirmed: boolean;
	registered: Date;
	confirmationHash: string;
	scopes: string[];
	unsubscribeHash: string;
	lastLogin?: Date;
	lastVisited?: Date;
	lastPasswordChange?: Date;
	passwordChangeHash?: string | null;
	portalURL?: string; // Legacy URL
	portalURLClasses?: string;
	portalURLCalendar?: string;
	canvasURL?: string;
	inPortalQueueClasses?: boolean;
	inPortalQueueCalendar?: boolean;
	unsubscribed?: string[];
}

export { getUser as get };
