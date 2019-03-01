import config from './config';

import * as fs from 'fs-extra';
import * as nodemailer from 'nodemailer';

import { StringDict } from './utils';

/**
 * Sends an email to the given user(s).
 * @param users User(s) to send the email to.
 * @param message Message to send.
 * @param transporter Nodemailer transport object.
 */
export async function send(users: string | string[], message: Message, transporter?: nodemailer.Transporter) {
	// Validate inputs
	if (typeof users !== 'string' && typeof users !== 'object') { throw new Error('Invalid user(s)!'); }
	if (typeof message !== 'object') { throw new Error('Invalid message object!'); }
	if (typeof message.subject !== 'string') { throw new Error('Invalid mail subject!'); }
	if (typeof message.html !== 'string') { throw new Error('Invalid mail html!'); }

	if (typeof transporter !== 'object') {
		transporter = nodemailer.createTransport(config.email.URI);
	}

	const mailOptions = {
		from: config.email.fromName + ' <' + config.email.fromEmail + '>',
		to: users.toString(),
		subject: message.subject,
		html: message.html
	};

	try {
		await transporter.sendMail(mailOptions);
	} catch (e) {
		throw new Error(`There was a problem sending the mail! (${e.message})`);
	}
}

/**
 * Sends an HTML email to the given user(s). Interpolates `{{key}}` with corresponding value from `data` object.
 * @param users User(s) to send the email to.
 * @param subject Subject of the email.
 * @param file Path to file containing the HTML email template.
 * @param data Data to fill out the template file with.
 * @param transporter Nodemailer transport object.
 */
// tslint:disable-next-line:max-line-length
export async function sendHTML(users: string | string[], subject: string, file: string, data: StringDict, transporter?: nodemailer.Transporter) {
	if (typeof file !== 'string') { throw new Error('Invalid mail file path!'); }
	if (typeof data !== 'object') { data = {}; }

	let body;
	try {
		body = await fs.readFile(file, 'utf8');
	} catch (e) {
		throw new Error('There was a problem reading the HTML path for the mail!');
	}

	// Replace JSON Key values with custom data
	for (const key of Object.keys(data)) {
		body = body.replace('{{' + key + '}}', data[key]);
	}

	const mesesage = {
		subject,
		html: body
	};

	return send(users, mesesage, transporter);
}

export interface Message {
	subject: string;
	html: string;
}
