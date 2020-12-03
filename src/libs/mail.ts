import * as fs from 'fs-extra';
import * as nodemailer from 'nodemailer';
import config from './config';

import { InternalError } from './errors';
import { StringDict } from './utils';

/**
 * Sends an email to the given user(s).
 * @param users User(s) to send the email to.
 * @param message Message to send.
 * @param transporter Nodemailer transport object.
 */
export async function send(
	users: string | string[],
	message: Message,
	transporter?: nodemailer.Transporter
) {
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
		if (!process.env.CI) {
			await transporter.sendMail(mailOptions);
		}
	} catch (e) {
		throw new InternalError(
			`There was a problem sending the mail! (${(e as Error).message})`,
			e
		);
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
export async function sendHTML(
	users: string | string[],
	subject: string,
	file: string,
	data: StringDict,
	transporter?: nodemailer.Transporter
) {
	let body;
	try {
		body = await fs.readFile(file, 'utf8');
	} catch (e) {
		throw new InternalError('There was a problem reading the HTML path for the mail!', e);
	}

	// Replace JSON Key values with custom data
	for (const key of Object.keys(data)) {
		body = body.replace('{{' + key + '}}', data[key]);
	}

	const message = {
		subject,
		html: body
	};

	return send(users, message, transporter);
}

export interface Message {
	subject: string;
	html: string;
}
