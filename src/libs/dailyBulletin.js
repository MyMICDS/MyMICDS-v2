'use strict';

/**
 * @file Manages the fetching and parsing of Daily Bulletins.
 * @module dailyBulletin
 */

var _    = require('underscore');
var fs   = require('fs-extra');
var path = require('path');

var googleServiceAccount = require(__dirname + '/googleServiceAccount.js');
var googleBatch = require('google-batch');
var google = googleBatch.require('googleapis')
var gmail = google.gmail('v1');

// Where to save Daily Bulletins
var bulletinDir = __dirname + '/../public/daily-bulletin';
// What label Daily Bulletins is categorized under
var label = 'us-daily-bulletin';
// Query to retrieve emails from
var query = 'label:' + label;

/**
 * Gets the most recent Daily Bulletin from Gmail and writes it to the bulletin directory
 * @function queryLatest
 * @param {queryLatestCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback queryLatestCallback
 * @param {Object} err - Null if success, error object if failure.
 */

function queryLatest(callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	// Get Google Service Account
	googleServiceAccount.create(function(err, jwtClient) {
		if(err) {
			callback(err);
			return;
		}

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
					if(part.mimeType === 'application/pdf' || part.mimeType === 'application/octet-stream') {
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
					var bulletinDate = null;
					// Search through email headers to find date of Daily Bulletin
					var headers = recentMessage.payload.headers;
					for(var i = 0; i < headers.length; i++) {
						var header = headers[i];
						if(header.name === 'Date') {
							bulletinDate = new Date(header.value);
							break;
						}
					}

					if(bulletinDate === null) {
						callback(new Error('Couldn\'t find Bulletin Date!'));
						return;
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

/**
 * Goes through all of the Daily Bulletins and writes them to file.
 * @function queryAll
 * @param {queryAllCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback queryAllCallback
 * @param {Object} err - Null if success, error object if failure.
 */

function queryAll(callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	googleServiceAccount.create(function(err, jwtClient) {

		// Array to store all message ids
		console.log('Get Daily Bulletin message ids...');
		var messageIds = [];

		function getPage(nextPageToken) {
			var listQuery = {
				auth: jwtClient,
				userId: 'me',
				maxResults: 200,
				q: query
			};
			if(typeof nextPageToken === 'string') {
				listQuery.pageToken = nextPageToken;
			}

			gmail.users.messages.list(listQuery, function(err, messageList) {
				if(err) {
					callback(new Error('There was a problem listing the messages from Gmail!'));
					return;
				}

				// Add message ids to array
				messageIds = messageIds.concat(messageList.messages);

				// If there is a next page, get it
				if(typeof messageList.nextPageToken === 'string') {
					console.log('Get next page with token ' + messageList.nextPageToken);
					getPage(messageList.nextPageToken);
				} else {
					// We got all the pages!
					// We start with the last so newer bulletins will override older ones if multiple emails were sent.
					// Create a batch so we can send up to 100 requests at once
					var batch = new googleBatch();
					batch.setAuth(jwtClient);

					// Array to store all the email information
					var getMessages = [];

					console.log('Get detailed information about messages...');
					function addMessageToBatch(i, inBatch) {
						if(i >= 0) {
							// Add to batch
							var messageId = messageIds[i].id;
							var params = {
								googleBatch: true,
								userId: 'me',
								id: messageId
							};

							batch.add(gmail.users.messages.get(params));
							inBatch++;

							// If there are 100 queries in Batch request, query it.
							if(inBatch === 100) {
								batch.exec(function(err, responses, errorDetails) {
									getMessages = getMessages.concat(responses);
									batch.clear();
									addMessageToBatch(--i, 0);
								});
							} else {
								addMessageToBatch(--i, inBatch);
							}
						} else {
							// Finished making batch requests
							// Execute the remaining of the API requests in the batch
							batch.exec(function(err, responses, errorDetails) {
								getMessages = getMessages.concat(responses);
								batch.clear();
								console.log('Got ' + getMessages.length + ' emails containing Daily Bulletins');

								// Now that we're all done getting information about the email, make an array of all the attachments.
								var attachments = [];
								// Array containing filenames matching the indexes of the attachments array
								var attachmentIdFilenames = [];

								// Search through the emails for any PDF
								for(var j = 0; j < getMessages.length; j++) {
									var response = getMessages[j];
									var parts = response.body.payload.parts;

									// Loop through parts looking for a PDF attachment
									for(var k = 0; k < parts.length; k++) {
										var part = parts[k];

										// If part contains PDF attachment, we're done boys.
										if(part.mimeType === 'application/pdf' || part.mimeType === 'application/octet-stream') {
											var attachmentId = part.body.attachmentId;
											attachments.push({
												emailId: response.body.id,
												attachmentId: attachmentId
											});
											attachmentIdFilenames.push(part.filename);
											break;
										}
									}
								}

								// Finally, make batch requests to get the actual PDF attachments
								console.log('Downloading Daily Bulletins...');
								var dailyBulletins = [];
								function addAttachmentToBatch(l, inBatch) {
									if(l < attachments.length) {
										// Add attachment to batch
										var attachment = attachments[l];
										var params = {
											googleBatch: true,
											userId: 'me',
											messageId: attachment.emailId,
											id: attachment.attachmentId
										};

										batch.add(gmail.users.messages.attachments.get(params));
										inBatch++;

										if(inBatch === 100) {
											batch.exec(function(err, responses, errorDetails) {
												dailyBulletins = dailyBulletins.concat(responses);
												batch.clear();
												addAttachmentToBatch(++l, 0);
											});
										} else {
											addAttachmentToBatch(++l, inBatch);
										}

									} else {
										// Finished getting attachments
										// Execute the remaining of the API requests in the batch
										batch.exec(function(err, responses, errorDetails) {
											dailyBulletins = dailyBulletins.concat(responses);
											batch.clear();

											// Finally, write all the Daily Bulletins to the proper directory
											console.log('Writing Daily Bulletins to file...');

											// Make sure directory for Daily Bulletin exists
											fs.ensureDir(bulletinDir, function(err) {
												if(err) {
													callback(new Error('There was a problem ensuring directory for Daily Bulletins!'));
													return;
												}

												function writeBulletin(m) {
													if(m < dailyBulletins.length) {
														var dailyBulletin = dailyBulletins[m];
														var pdf = Buffer.from(dailyBulletin.body.data, 'base64');

														// We must now get the filename of the Daily Bulletin
														var originalFilename = path.parse(attachmentIdFilenames[m]);
														// Parse base filename to date
														var bulletinDate = new Date(originalFilename.name);

														// If not valid date, it isn't the Daily Bulletin
														if(_.isNaN(bulletinDate.getTime())) {
															writeBulletin(++m);
															return;
														}

														// Get PDF name
														var bulletinName = bulletinDate.getFullYear()
															+ '-' + leadingZeros(bulletinDate.getMonth() + 1)
															+ '-' + leadingZeros(bulletinDate.getDate())
															+ '.pdf';

														// Write PDF to file
														fs.writeFile(bulletinDir + '/' + bulletinName, pdf, function(err) {
															if(err) {
																callback(new Error('There was a problem writing the PDF!'));
																return;
															}

															writeBulletin(++m);

														});
													} else {
														// All done writing Daily Bulletins!
														console.log('Done!');
														callback(null);
													}
												}
												writeBulletin(0);

											});
										});
									}
								}
								addAttachmentToBatch(0, 0);

							});
						}
					}
					addMessageToBatch(messageIds.length - 1, 0);

				}
			});
		}
		getPage();

	});

}

/**
 * Returns an array of the Daily Bulletin names in the Daily Bulletin directory.
 * @function getList
 * @param {getListCallback} callback - Callback
 */

/**
 * Returns an array of bulletin names from newest to oldest
 * @callback getListCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} bulletins - Array of bulletins from newest to oldest. Null if error.
 */

function getList(callback) {
	if(typeof callback !== 'function') return;

	// Read directory
	fs.readdir(bulletinDir, function(err, files) {
		if(err) {
			callback(new Error('There was a problem reading the bulletin directory!'), null);
			return;
		}

		// Only return files that are a PDF
		var bulletins = [];
		for(var i = 0; i < files.length; i++) {
			var file = path.parse(files[i]);
			if(file.ext === '.pdf') {
				bulletins.push(files[i]);
			}
		}

		// Sort bulletins to get most recent
		bulletins.sort();
		bulletins.reverse();

		callback(null, bulletins);

	});
}

/**
 * Returns a number with possible leading zero if under 10
 * @function leadingZeros
 * @param {Number} n - number
 * @returns {Number|String}
 */

function leadingZeros(n) {
	if(n < 10) {
		return '0' + n;
	} else {
		return n;
	}
}

module.exports.queryLatest = queryLatest;
module.exports.queryAll    = queryAll;
module.exports.getList     = getList;
