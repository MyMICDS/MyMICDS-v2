'use strict';

/**
 * @file User management functions
 * @module users
 */
const _ = require('underscore');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const cryptoUtils = require(__dirname + '/cryptoUtils.js');
const mail = require(__dirname + '/mail.js');
const users = require(__dirname + '/users.js');

// Passwords not allowed
const passwordBlacklist = [
	'', // Empty string
	'Nick is not a nerd' // Because he is
];

/**
 * Determines whether a password matches for a certain user
 * @function passwordMatches
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} password - Plaintext password
 * @param {passwordMatchesCallback} callback - Callback
 */

/**
 * Returns whether password matches or not
 * @callback passwordMatchesCallback
 *
 * @param {Object} err - Null if successful, error object if failure.
 * @param {Boolean} matches - True if password matches, false if not. Null if error.
 * @param {Boolean} confirmed - Whether or not the user has confirmed their account.
 */

async function passwordMatches(db, user, password) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof password !== 'string') throw new Error('Invalid password!');

	const { isUser, userDoc } = await users.get(db, user);
	// If invalid user, we just want to say username / password doesn't match
	if (!isUser) return { matches: false, confirmed: false };

	const hash = userDoc['password'];

	return new Promise((resolve, reject) => {
		bcrypt.compare(password, hash, (err, res) => {
			if (err) {
				reject(new Error('There was a problem comparing the passwords!'));
				return;
			}

			resolve({ matches: res, confirmed: !!userDoc['confirmed'] });
		});
	});
}

/**
 * Changes the password if old password matches
 * @function changePassword
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} oldPassword - Old plaintext password
 * @param {string} newPassword - New plaintext password to change
 * @param {changePasswordCallback} callback - Callback
 */

/**
 * Returns an error (if any) about changing the user's password
 * @callback changePasswordCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

async function changePassword(db, user, oldPassword, newPassword) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof newPassword !== 'string') throw new Error('Invalid new password!');

	if (typeof oldPassword !== 'string' || _.contains(passwordBlacklist, newPassword)) {
		throw new Error('Invalid old password!');
	}

	const { isUser } = await users.get(db, user);
	if (!isUser) throw new Error('Invalid user!');

	// Compare oldPassword with password in database
	const { matches } = await passwordMatches(db, user, oldPassword);
	if (!matches) throw new Error('Password does not match!');

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
 * Creates a password confirmation hash and sends an email to the user to change their password.
 * You do not need to input a password yet, as that comes later when the user clicks on the link.
 * @function resetPasswordEmail
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {resetPasswordEmailCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback resetPasswordEmailCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

async function resetPasswordEmail(db, user) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	// Generate password hash for confirmation link
	const buf = await new Promise((resolve, reject) => {
		crypto.randomBytes(16, (err, buf) => {
			if (err) {
				reject(new Error('There was a problem generating a random confirmation hash!'));
				return;
			}

			resolve(buf);
		});
	});

	const hash = buf.toString('hex');
	const hashedHash = cryptoUtils.shaHash(hash);

	// Now let's insert the passwordChangeHash into the database
	const userdata = db.collection('users');

	try {
		await userdata.updateOne({
			_id: userDoc['_id'],
			user: userDoc['user']
		}, { $set: { passwordChangeHash: hashedHash } }, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem inserting the confirmation hash into the database!');
	}

	// Send confirmation email
	const email = userDoc['user'] + '@micds.org';
	const emailReplace = {
		firstName: userDoc['firstName'],
		lastName: userDoc['lastName'],
		passwordLink: 'https://mymicds.net/reset-password/' + userDoc['user'] + '/' + hash
	};

	// Send email confirmation
	await new Promise((resolve, reject) => {
		mail.sendHTML(email, 'Change Your Password', __dirname + '/../html/messages/password.html', emailReplace, err => {
			if (err) {
				reject(err);
				return;
			}

			resolve();
		});
	});
}

/**
 * Changes the password if hash matches the user's passwordChangeHash
 * @function resetPassword
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} password - Plaintext password to change
 * @param {string} hash - passwordChangeHash from confirmation email
 * @param {resetPasswordCallback} callback - Callback
 */

/**
 * Returns an error (if any) about changing the user's password
 * @callback resetPasswordCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

async function resetPassword(db, user, password, hash) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof password !== 'string' || _.contains(passwordBlacklist, password)) throw new Error('Invalid password!');
	if (typeof hash !== 'string') throw new Error('Invalid hash!');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	if (typeof userDoc['passwordChangeHash'] !== 'string' || userDoc['passwordChangeHash'] === null) {
		throw new Error('Password change email was never sent!');
	}

	if (!cryptoUtils.safeCompareSHA(hash, userDoc['passwordChangeHash'])) {
		// Hash is not valid
		throw new Error('Invalid hash!');
	}

	// Change password
	const hashedPassword = await cryptoUtils.hashPassword(password);

	const userdata = db.collection('users');

	// Update password in the database
	try {
		await userdata.updateOne({ _id: userDoc['_id'], user: userDoc['user'] }, {
			$set: {
				password: hashedPassword,
				passwordChangeHash: null
			}, $currentDate: { lastPasswordChange: true }
		});
	} catch (e) {
		throw new Error('There was a problem updating the password in the database!');
	}
}

module.exports.passwordMatches    = passwordMatches;
module.exports.passwordBlacklist  = passwordBlacklist;
module.exports.changePassword     = changePassword;
module.exports.resetPasswordEmail = resetPasswordEmail;
module.exports.resetPassword      = resetPassword;
