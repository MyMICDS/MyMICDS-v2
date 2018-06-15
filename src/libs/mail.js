'use strict';

/**
 * @file Sends emails
 * @module mail
 */
const config = require(__dirname + '/config.js');

const fs = require('fs');
const nodemailer = require('nodemailer');

const { promisify } = require('util');

/**
 * Sends mail to the desired user
 * @function send
 *
 * @param {string|Object} users - Single email string, OR an array of multiple emails
 *
 * @param {Object} message - JSON containing details of message
 * @param {string} message.subject - Subject of email
 * @param {string} message.html - HTML message
 * @param {sendCallback} callback - Callback
 * @param [Object] transporter - Optional transporter so we don't have to log in again
 */

/**
 * Callback after a message is sent
 * @callback sendCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

async function send(users, message, transporter) {
	// Validate inputs
	if (typeof users !== 'string' && typeof users !== 'object') throw new Error('Invalid user(s)!');
	if (typeof message !== 'object') throw new Error('Invalid message object!');
	if (typeof message.subject !== 'string') throw new Error('Invalid mail subject!');
	if (typeof message.html !== 'string') throw new Error('Invalid mail html!');

	if (typeof transporter !== 'object') {
		transporter = nodemailer.createTransport(config.email.URI);
	}

	const mailOptions = {
		from: config.email.fromName + ' <' + config.email.fromEmail + '>',
		to: users.toString(),
		subject: message.subject,
		html: message.html,
	};

	try {
		await promisify(transporter.sendMail)(mailOptions);
	} catch (e) {
		throw new Error(`There was a problem sending the mail! (${e.message})`);
	}
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
 * @param [Object] transporter - Optional transporter so we don't have to log in again
 */

/**
 * Callback after sending the HTML email
 * @callback sendHTMLCallback
 *
 * @param {Object} err - Null if successful, error object if failure
 */

async function sendHTML(users, subject, file, data, transporter) {
	if (typeof file !== 'string') throw new Error('Invalid mail file path!');
	if (typeof data !== 'object') data = {};

	let body;
	try {
		body = await promisify(fs.readFile)(file, 'utf8');
	} catch (e) {
		throw new Error('There was a problem reading the HTML path for the mail!');
	}

	// Replace JSON Key values with custom data
	for (const key of Object.keys(data)) {
		body = body.replace('{{' + key + '}}', data[key]);
	}

	const mesesage = {
		subject,
		html: body,
	};

	return send(users, mesesage, transporter);
}

module.exports.send     = send;
module.exports.sendHTML = sendHTML;
