import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Db } from 'mongodb';
import { promisify } from 'util';
import * as cryptoUtils from './cryptoUtils';
import * as mail from './mail';
import * as users from './users';

// Passwords not allowed
export const passwordBlacklist = [
	'', // Empty string
	'Nick is not a nerd' // Because he is
];

/**
 * Checks whether a plaintext password matches with the user's hashed password.
 * @param db Database connection.
 * @param user Username.
 * @param password Plaintext password.
 * @returns Whether the password matched and whether the user's account is confirmed.
 */
export async function passwordMatches(db: Db, user: string, password: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof password !== 'string') { throw new Error('Invalid password!'); }

	const { isUser, userDoc } = await users.get(db, user);
	// If invalid user, we just want to say username / password doesn't match
	if (!isUser) { return { matches: false, confirmed: false }; }

	const hash = userDoc!.password;

	let res: boolean;
	try {
		res = await promisify(bcrypt.compare)(password, hash);
	} catch (e) {
		throw new Error('There was a problem comparing the passwords!');
	}

	return { matches: res, confirmed: !!userDoc!.confirmed };
}

/**
 * Changes a user's password if they still know their old password.
 * @param db Database connection.
 * @param user Username.
 * @param oldPassword The user's current/old password.
 * @param newPassword The new password to set.
 */
export async function changePassword(db: Db, user: string, oldPassword: string, newPassword: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof newPassword !== 'string') { throw new Error('Invalid new password!'); }

	if (typeof oldPassword !== 'string' || passwordBlacklist.includes(newPassword)) {
		throw new Error('Invalid old password!');
	}

	const { isUser } = await users.get(db, user);
	if (!isUser) { throw new Error('Invalid user!'); }

	// Compare oldPassword with password in database
	const { matches } = await passwordMatches(db, user, oldPassword);
	if (!matches) { throw new Error('Password does not match!'); }

	const hash = await cryptoUtils.hashPassword(newPassword);

	// Update new password into database
	const userdata = db.collection('users');

	try {
		await userdata.updateOne({ user }, { $set: { password: hash }, $currentDate: { lastPasswordChange: true } });
	} catch (e) {
		throw new Error('There was a problem updating the password in the database!');
	}
}

/**
 * Creates a reset hash and sends a reset password email.
 * @param db Database connection.
 * @param user Username.
 */
export async function resetPasswordEmail(db: Db, user: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	// Generate password hash for confirmation link
	let buf: Buffer;
	try {
		buf = await promisify(crypto.randomBytes)(16);
	} catch (e) {
		throw new Error('There was a problem generating a random confirmation hash!');
	}

	const hash = buf.toString('hex');
	const hashedHash = cryptoUtils.shaHash(hash);

	// Now let's insert the passwordChangeHash into the database
	const userdata = db.collection('users');

	try {
		await userdata.updateOne({
			_id: userDoc!._id,
			user: userDoc!.user
		}, { $set: { passwordChangeHash: hashedHash } }, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem inserting the confirmation hash into the database!');
	}

	// Send confirmation email
	const email = userDoc!.user + '@micds.org';
	const emailReplace = {
		firstName: userDoc!.firstName,
		lastName: userDoc!.lastName,
		passwordLink: 'https://mymicds.net/reset-password/' + userDoc!.user + '/' + hash
	};

	// Send email confirmation

	return mail.sendHTML(email, 'Change Your Password', __dirname + '/../html/messages/password.html', emailReplace);
}

/**
 * Changes a user's password if the reset hash matches the hash stored in the database.
 * @param db Database connection.
 * @param user Username.
 * @param password The new password.
 * @param hash The reset hash.
 */
export async function resetPassword(db: Db, user: string, password: string, hash: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof password !== 'string' || passwordBlacklist.includes(password)) { throw new Error('Invalid password!'); }
	if (typeof hash !== 'string') { throw new Error('Invalid hash!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	if (typeof userDoc!.passwordChangeHash !== 'string' || userDoc!.passwordChangeHash === null) {
		throw new Error('Password change email was never sent!');
	}

	if (!cryptoUtils.safeCompare(hash, userDoc!.passwordChangeHash!)) {
		// Hash is not valid
		throw new Error('Invalid hash!');
	}

	// Change password
	const hashedPassword = await cryptoUtils.hashPassword(password);

	const userdata = db.collection('users');

	// Update password in the database
	try {
		await userdata.updateOne({ _id: userDoc!._id, user: userDoc!.user }, {
			$set: {
				password: hashedPassword,
				passwordChangeHash: null
			}, $currentDate: { lastPasswordChange: true }
		});
	} catch (e) {
		throw new Error('There was a problem updating the password in the database!');
	}
}
