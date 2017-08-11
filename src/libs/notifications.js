/**
 * @file Functions for sending out notifications to our users
 * @module notifications
 */

const mail  = require(__dirname + '/mail.js');
const utils = require(__dirname + '/utils.js');
const users = require(__dirname + '/users.js');

const typesConfig = {
	canvasNightBefore: {
		subject: '',
		path: '',
		data: () => {}
	},
	formalDress: {
		subject: '',
		path: ''
	}
};

/**
 * Send a notification to a user
 * @param {Object} db - Database object
 * @param {String|Array} users - Either a single user or a list of users to send the notification to
 * @param {String} type - String containing the type of notification to be sent
 * @param {Object} messageData - Custom data to interpolate into the email
 * @param {notifyCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback notifyCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function notify(db, notifyUsers, type, messageData, callback) {
	if(typeof callback !== 'function') return;
	if(typeof notifyUsers === 'string') {
		notifyUsers = [notifyUsers];
	} else if(typeof notifyUsers !== 'object') {
		callback(new Error('Invalid user(s)!'));
		return;
	}
	if(typeof type !== 'string') {
		callback(new Error('Invalid type!'));
		return;
	}
	if(typeof messageData !== 'object') messageData = {};

	function loopUsers(i) {
		if(i >= notifyUsers.length) {
			callback(null);
			return;
		}

		const user = notifyUsers[i];

		users.get(db, user, (err, isUser, userDoc) => {
			if(err) {
				callback(err);
				return;
			}
			if(!isUser) {
				callback(new Error('User doesn\'t exist!'));
				return;
			}

			const typeInfo = typesConfig[type];
			const sent = userDoc.notifications.includes(type);
			const newNotification = {
				user: userDoc._id,
				type,
				sent,
				timestamp: new Date()
			};

			if(typeof typeInfo.data === 'function') {
				newNotification.data = typeInfo.data(messageData);
			}

			const notificationdata = db.collection('notifications');

			notificationdata.insertOne(newNotification, (err, { insertedId }) => {
				if(err) {
					callback(new Error('There was an error processing the notification!'));
					return;
				}
				if(sent) {
					messageData.unsubLink = `https://mymicds.net/unsubscribe/${user}/${insertedId}`;

					mail.sendHTML(user + '@micds.org', utils.interpolateWithObject(typeInfo.subject, messageData), __dirname + '/../html/messages/' + typeInfo.path, messageData, err => {
						if(err) {
							callback(err);
							return;
						}

						callback(null);
					});
					return;
				}

				callback(null);
			});
		});
	}

	loopUsers(0);
}

module.exports.notify = notify;
