/**
 * @file Functions for sending out notifications to our users
 * @module notifications
 */

// const mail  = require(__dirname + '/mail.js');
// const users = require(__dirname + '/users.js');


/**
 * Send a notification to a user
 * @param {Object} db - Database object
 * @param {String|Array} users - Either a single user or a list of users to send the notification to
 * @param {String} type - String containing the type of notification to be sent
 * @param {Object} message - JSON containing details of message
 * @param {string} message.subject - Subject of email
 * @param {string} message.file - Path to HTML file
 * @param {Object} message.data - Custom data to interpolate into the email
 * @param {notifyCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback notifyCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function notify(db, users, type, message, callback) {
	// Stupid type validation
	// This is why I wish we had TypeScript
	if(typeof callback !== 'function') return;
	if(typeof users !== 'string' && typeof users !== 'object') {
		callback(new Error('Invalid user(s)!'));
		return;
	}
	if(typeof type !== 'string') {
		callback(new Error('Invalid type!'));
		return;
	}
	if(typeof message !== 'object') {
		callback(new Error('Invalid message object!'));
		return;
	}
	if(typeof message.subject !== 'string') {
		callback(new Error('Invalid message subject!'));
		return;
	}
	if(typeof message.file !== 'string') {
		callback(new Error('Invalid message file path!'));
		return;
	}
	if(typeof message.data !== 'object') message.data = {};

	// TODO: finish this
}

module.exports.notify = notify;
