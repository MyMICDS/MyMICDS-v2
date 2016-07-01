'use strict';

/**
 * @file Sends emails
 * @module mail
 */

var config = require(__dirname + '/config.js');

var fs         = require('fs');
var nodemailer = require('nodemailer');

/**
 * Sends mail to the desired user
 * @function send
 *
 * @param {string|Object} users - Single email string, OR an array of multiple emails
 *
 * @param {Object} message - JSON containing details of message
 * @param {string} message.subject - Subject of email
 * @param {string} message.html - HTML message
 *
 * @param {sendCallback} callback - Callback
 */

/**
 * Callback after a message is sent
 * @callback sendCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function send(users, message, callback) {

	// Validate inputs
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof users !== 'string' && typeof users !== 'object') {
		callback(new Error('Invalid user(s)!'));
		return;
	}
	if(typeof message !== 'object') {
		callback(new Error('Invalid message object!'));
		return;
	}
	if(typeof message.subject !== 'string') {
		callback(new Error('Invalid mail subject!'));
		return;
	}
	if(typeof message.html !== 'string') {
		callback(new Error('Invalid mail html!'));
		return;
	}

	var transporter = nodemailer.createTransport(config.email.URI);

	var mailOptions = {
		from   : config.email.fromName + ' <' + config.email.fromEmail + '>',
		to     : users.toString(),
		subject: message.subject,
		html   : message.html,
	}

	transporter.sendMail(mailOptions, function(err, info) {

		if(err) {
			callback(new Error('There was a problem sending the mail!'));
			return;
		}

		callback(null);

	});
}

/**
 * Sends an email with supplied HTML file path, can insert custom data into HTML file
 * @function sendHTML
 *
 * @param {string|Object} users - Single email string, OR an array of multiple emails
 * @param {string} subject - Subject of email
 * @param {string} file - Path to HTML file
 * @param {Object} data - JSON of custom data. (Ex. Replace '{{firstName}}' in HTML by putting 'firstName: Michael' in the JSON). Set to empty object if there's no data.
 * @param {sendHTMLCallback} callback - Callback
 */

/**
 * Callback after sending the HTML email
 * @callback sendHTMLCallback
 *
 * @param {Object} err - Null if successful, error object if failure
 */

function sendHTML(users, subject, file, data, callback) {

	// Validate inputs
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof file !== 'string') {
		callback(new Error('Invalid mail file path!'));
		return;
	}
	if(typeof data !== 'object') {
		data = {};
	}

	fs.readFile(file, 'utf8', function(err, body) {
		if(err) {
			callback(new Error('There was a problem reading the HTML path for the mail!'));
			return;
		}

		// Replace JSON Key values with custom data
		for(var key in data) {
			body = body.replace('{{' + key + '}}', data[key]);
		}

		var mesesage = {
			subject: subject,
			html   : body,
		}

		send(users, mesesage, callback);
	});
}

module.exports.send     = send;
module.exports.sendHTML = sendHTML;
