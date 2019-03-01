import { RegisterParameters } from '@mymicds/sdk';
import * as crypto from 'crypto';
import { Db } from 'mongodb';
import * as _ from 'underscore';
import { promisify } from 'util';
import * as admins from './admins';
import * as cryptoUtils from './cryptoUtils';
import * as jwt from './jwt';
import * as mail from './mail';
import * as passwords from './passwords';
import * as users from './users';
import { Omit } from './utils';

/**
 * Validates a user's credentials and updates the last time they logged in.
 * @param db Database connection.
 * @param user Username.
 * @param password Plaintext password.
 * @param rememberMe Whether JWT should expire in 30 days instead of 12 hours.
 * @param comment Comment to associate with the JWT.
 * @returns JWT or human-readable error message.
 */
export async function login(db: Db, user: string, password: string, rememberMe: boolean, comment: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }
	if (typeof password !== 'string') { throw new Error('Invalid password!'); }
	if (typeof rememberMe !== 'boolean') { rememberMe = true; }

	user = user.toLowerCase();

	const { matches, confirmed } = await passwords.passwordMatches(db, user, password);
	if (!confirmed) {
		return {
			success: false,
			// tslint:disable-next-line:max-line-length
			message: 'Account is not confirmed! Please check your email or register under the same username to resend the email.',
			jwt: null
		};
	}
	if (!matches) {
		return { success: false, message: 'Invalid username / password!', jwt: null };
	}

	// Update lastLogin in database
	const userdata = db.collection('users');
	await userdata.updateOne({ user }, { $currentDate: { lastLogin: true }});

	// Login successful!
	// Now we need to create a JWT
	const token = await jwt.generate(db, user, rememberMe, comment);

	return { success: true, message: 'Success!', jwt: token };
}

/**
 * Registers a user into the database and sends a confirmation email.
 * @param db Database connection.
 * @param user User object.
 */
// tslint:disable-next-line:max-line-length
export async function register(db: Db, user: Omit<RegisterParameters, 'teacher' | 'gradYear'> & { gradYear: number | null }) {
	// Validate inputs
	if (typeof db   !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'object') { throw new Error('Invalid user object!'); }
	if (typeof user.user !== 'string') { throw new Error('Invalid username!'); }

	// Make sure username is lowercase
	user.user = user.user.toLowerCase();

	if (typeof user.password  !== 'string' || passwords.passwordBlacklist.includes(user.password)) {
		throw new Error('Invalid password!');
	}

	if (typeof user.firstName !== 'string') { throw new Error('Invalid first name!'); }
	if (typeof user.lastName  !== 'string') { throw new Error('Invalid last name!'); }

	// If gradYear not valid, default to faculty
	if (typeof user.gradYear !== 'number' || user.gradYear % 1 !== 0 || _.isNaN(user.gradYear)) {
		user.gradYear = null;
	}

	// Check if it's an already existing user
	const { isUser, userDoc: data } = await users.get(db, user.user);

	if (isUser && data!.confirmed) {
		throw new Error('An account is already registered under the email ' + user.user + '@micds.org!');
	}

	const userdata = db.collection('users');

	let confirmationBuf: Buffer;
	try {
		confirmationBuf = await promisify(crypto.randomBytes)(16);
	} catch (e) {
		throw new Error('There was a problem generating a random confirmation hash!');
	}

	const confirmationHash = confirmationBuf.toString('hex');

	let unsubscribeBuf: Buffer;
	try {
		unsubscribeBuf = await promisify(crypto.randomBytes)(16);
	} catch (e) {
		throw new Error('There was a problem generating a random email hash!');
	}

	const unsubscribeHash = unsubscribeBuf.toString('hex');

	// Hash Password
	const hashedPassword = await cryptoUtils.hashPassword(user.password);

	const newUser = {
		user: user.user,
		password: hashedPassword,
		firstName: user.firstName,
		lastName: user.lastName,
		gradYear: user.gradYear,
		confirmed: false,
		registered: new Date(),
		confirmationHash,
		unsubscribeHash,
		scopes: []
	};

	try {
		await userdata.updateOne({ user: newUser.user }, { $set: newUser }, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem inserting the account into the database!');
	}

	const email = newUser.user + '@micds.org';
	const emailReplace = {
		firstName: newUser.firstName,
		lastName: newUser.lastName,
		confirmLink: 'https://mymicds.net/confirm/' + newUser.user + '/' + confirmationHash
	};

	// Send confirmation email
	await mail.sendHTML(email, 'Confirm Your Account', __dirname + '/../html/messages/register.html', emailReplace);

	// Let's celebrate and the message throughout the land!
	try {
		await admins.sendEmail(db, {
			subject: newUser.user + ' just created a 2.0 account!',
			// tslint:disable-next-line:max-line-length
			html: `${newUser.firstName} ${newUser.lastName} (${newUser.gradYear}) just created an account with the username ${newUser.user}`
		});
	} catch (e) {
		// tslint:disable-next-line:no-console
		console.log('[' + new Date() + '] Error occured when sending admin notification! (' + e + ')');
	}
}

/**
 * Confirms a user's account if the hash matches what's stored in the database.
 * @param db Database connection.
 * @param user Username.
 * @param hash Confirmation hash.
 */
export async function confirm(db: Db, user: string, hash: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }
	if (typeof hash !== 'string') { throw new Error('Invalid hash!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const dbHash = userDoc!.confirmationHash;

	if (cryptoUtils.safeCompare(hash, dbHash)) {
		// Hash matches, confirm account!
		const userdata = db.collection('users');

		try {
			await userdata.updateOne({ user }, { $set: { confirmed: true } });
		} catch (e) {
			throw new Error('There was a problem updating the database!');
		}
	} else {
		// Hash does not match
		throw new Error('Hash not valid!');
	}
}
