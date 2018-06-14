'use strict';

/**
 * @file Defines authorization-related functions.
 * @module auth
 */
const _ = require('underscore');
const admins = require(__dirname + '/admins.js');
const crypto = require('crypto');
const cryptoUtils = require(__dirname + '/cryptoUtils.js');
const jwt = require(__dirname + '/jwt.js'); // eslint-disable-line
const mail = require(__dirname + '/mail.js');
const passwords = require(__dirname + '/passwords.js');
const users = require(__dirname + '/users.js');

/**
 * Validates a user's credentials and updates the 'lastLogin' field.
 * @function login
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} password - Plaintext password
 * @param {Boolean} rememberMe - Whether JWT token should expire in 30 days instead of 1 day
 * @param {string} comment - JWT comment
 * @param {loginCallback} callback - Callback
 */

/**
 * Callback after a user is logged in
 * @callback loginCallback
 *
 * @param {Object} err - Null if successful, error object if failure.
 * @param {Boolean} response - True if credentials match in database, false if not. Null if error.
 * @param {string} message - Message containing details for humans. Null if error.
 * @param {string} jwt - JSON Web Token for user to make API calls with. Null if error, login invalid, or rememberMe is false.
 */

async function login(db, user, password, rememberMe, comment) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof user !== 'string') throw new Error('Invalid username!');
	if (typeof password !== 'string') throw new Error('Invalid password!');
	if (typeof rememberMe !== 'boolean') rememberMe = true;

	user = user.toLowerCase();

	const { matches: passwordMatches, confirmed } = await passwords.passwordMatches(db, user, password);
	if (!confirmed) {
		return { response: false, message: 'Account is not confirmed! Please check your email or register under the same username to resend the email.', jwt: null };
	}
	if (!passwordMatches) {
		return { response: false, message: 'Invalid username / password!', jwt: null };
	}

	// Update lastLogin in database
	const userdata = db.collection('users');
	await userdata.updateOne({ user }, { $currentDate: { lastLogin: true }});

	// Login successful!
	// Now we need to create a JWT
	const jwt = await jwt.generate(db, user, rememberMe, comment);

	return { response: true, message: 'Success!', jwt };
}

/**
 * Registers a user by adding their credentials into the database. Also sends email confirmation.
 * @function register
 *
 * @param {Object} db - Database connection
 *
 * @param {Object} user - User's credentials
 * @param {string} user.Username - Username (___@micds.org)
 * @param {string} user.password - User's plaintext password
 * @param {string} user.firstName - User's first name
 * @param {string} user.lastName - User's last name
 * @param {Number} user.gradYear - User's graduation year (Ex. Class of 2019). Set to null if faculty.
 *
 * @param {registerCallback} callback - Callback
 */

/**
 * Callback after a user is registered
 * @callback registerCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

async function register(db, user) {
	// Validate inputs
	if (typeof db   !== 'object') throw new Error('Invalid database connection!');
	if (typeof user !== 'object') throw new Error('Invalid user object!');
	if (typeof user.user !== 'string') throw new Error('Invalid username!');

	// Make sure username is lowercase
	user.user = user.user.toLowerCase();

	if (typeof user.password  !== 'string' || _.contains(passwords.passwordBlacklist, user.password)) {
		throw new Error('Invalid password!');
	}

	if (typeof user.firstName !== 'string') throw new Error('Invalid first name!');
	if (typeof user.lastName  !== 'string') throw new Error('Invalid last name!');

	// If gradYear not valid, default to faculty
	if (typeof user.gradYear !== 'number' || user.gradYear % 1 !== 0 || _.isNaN(user.gradYear)) {
		user.gradYear = null;
	}

	// Check if it's an already existing user
	const { isUser, userDoc: data } = await users.get(db, user.user);

	if (isUser && data.confirmed) throw new Error('An account is already registered under the email ' + user.user + '@micds.org!');

	const userdata = db.collection('users');

	// Generate confirmation email hash
	const confirmationBuf = await new Promise((resolve, reject) => {
		crypto.randomBytes(16, (err, buf) => {
			if (err) {
				reject(new Error('There was a problem generating a random confirmation hash!'));
				return;
			}

			resolve(buf);
		});
	});

	const confirmationHash = confirmationBuf.toString('hex');

	// Generate unsubscribe email hash
	const unsubscribeBuf = await new Promise((resolve, reject) => {
		crypto.randomBytes(16, (err, buf) => {
			if (err) {
				reject(new Error('There was a problem generating a random email hash!'));
				return;
			}

			resolve(buf);
		});
	});

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
		await userdata.updateOne({ user: newUser.user }, newUser, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem inserting the account into the database!');
	}

	const email = newUser.user + '@micds.org';
	const emailReplace = {
		firstName: newUser.firstName,
		lastName: newUser.lastName,
		confirmLink: 'https://mymicds.net/confirm/' + newUser.user + '/' + confirmationHash,
	};

	// Send confirmation email

	await new Promise((resolve, reject) => {
		mail.sendHTML(email, 'Confirm Your Account', __dirname + '/../html/messages/register.html', emailReplace, err => {
			if (err) {
				reject(err);
				return;
			}

			resolve();
		});
	});

	// Let's celebrate and the message throughout the land!
	try {
		await admins.sendEmail(db, {
			subject: newUser.user + ' just created a 2.0 account!',
			html: newUser.firstName + ' ' + newUser.lastName + ' (' + newUser.gradYear + ') just created an account with the username ' + newUser.user
		});
	} catch (e) {
		console.log('[' + new Date() + '] Error occured when sending admin notification! (' + e + ')');
	}
}

/**
 * Confirms a user's account if hash matches. This is used to confirm the user's email and account via email.
 * @function confirm
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} hash - Hashed password from the database
 * @param {confirmCallback} callback - Callback
 */

/**
 * Callback after the account has is confirmed
 * @callback confirmCallback
 *
 * @param {Object} err - Null if successful, error object if failure
 */

async function confirm(db, user, hash) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof user !== 'string') throw new Error('Invalid username!');
	if (typeof hash !== 'string') throw new Error('Invalid hash!');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	const dbHash = userDoc['confirmationHash'];

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

module.exports.login    = login;
module.exports.register = register;
module.exports.confirm  = confirm;
