'use strict';

/**
 * @file Manages the fetching and parsing of Daily Bulletins.
 * @module dailyBulletin
 */

var googleServiceAccount = require(__dirname + '/googleServiceAccount.js');
var fs = require('fs-extra');

// Where to save Daily Bulletins
var bulletinDir = __dirname + '/../public/daily-bulletin';
// What label Daily Bulletins is categorized under
var label = 'us-daily-bulletin';

/**
 * Gets the most recent Daily Bulletin from Gmail and writes it to the bulletin directory
 * @function queryBulletin
 * @param {queryBulletinCallback} callback - Callback
 */

/**
 * Returns the Daily Bulletin
 * @callback queryBulletinCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function queryBulletin(callback) {
	if(typeof callback !== 'function') return;

	// Get Google Service Account
	googleServiceAccount.createServiceAccount(function(err, google, jwtClient, tokens) {
		if(err) {
			callback(err);
			return;
		}

		var gmail = google.gmail('v1');

		// Query to retrieve emails from
		var query = 'label:' + label;

		// Get list of messages
		gmail.users.messages.list({
			auth: jwtClient,
			userId: 'me',
			q: query
		}, function(err, messageList) {
			if(err) {
				callback(new Error('There was a problem listing the messages from Gmail!'));
				return;
			}

			// Get the most recent email id
			var recentMsgId = messageList.messages[0].id;

			// Now get details on most recent email
			gmail.users.messages.get({
				auth: jwtClient,
				userId: 'me',
				id: recentMsgId
			}, function(err, recentMessage) {
				if(err) {
					callback(new Error('There was a problem getting the most recent email!'));
					return;
				}

				// Search through the email for any PDF
				var parts = recentMessage.payload.parts;
				var attachmentId = null;
				for(var i = 0; i < parts.length; i++) {
					var part = parts[i];

					// If part contains PDF attachment, we're done boys.
					if(part.mimeType === 'application/pdf') {
						attachmentId = part.body.attachmentId;
						break;
					}
				}

				if(attachmentId === null) {
					callback(new Error('The most recent Daily Bulletin email did not contain any PDF attachment!'));
					return;
				}

				// Get PDF attachment with attachment id
				gmail.users.messages.attachments.get({
					auth: jwtClient,
					userId: 'me',
					messageId: recentMsgId,
					id: attachmentId
				}, function(err, attachment) {
					if(err) {
						callback(new Error('There was a problem getting the PDF attachment!'));
						return;
					}

					// PDF Contents
					var pdf = Buffer.from(attachment.data, 'base64');

					// Get date of PDF
					var bulletinDate = new Date();
					// Search through email headers to find date
					var headers = recentMessage.payload.headers;
					for(var i = 0; i < headers.length; i++) {
						var header = headers[i];
						if(header.name === 'Date') {
							var bulletinDate = new Date(header.value);
							break;
						}
					}

					// Get PDF name
					var bulletinName = bulletinDate.getFullYear()
						+ '-' + leadingZeros(bulletinDate.getMonth())
						+ '-' + leadingZeros(bulletinDate.getDate())
						+ '.pdf';

					// Make sure directory for Daily Bulletin exists
					fs.ensureDir(bulletinDir, function(err) {
						if(err) {
							callback(new Error('There was a problem ensuring directory for Daily Bulletins!'));
							return;
						}

						// Write PDF to file
						fs.writeFile(bulletinDir + '/' + bulletinName, pdf, function(err) {
							if(err) {
								callback(new Error('There was a problem writing the PDF!'));
								return;
							}

							callback(null);

						});

					});
				});
			});
		});
	});
}

function leadingZeros(n) {
	if(n < 10) {
		return '0' + n;
	} else {
		return n;
	}
}

module.exports.queryBulletin = queryBulletin;
