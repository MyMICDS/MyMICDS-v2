/**
 * @file Sends emails
 * @module mail
 */

var config      = require(__dirname + '/requireConfig.js');
var fs          = require('fs');
var MongoClient = require('mongodb').MongoClient;
var nodemailer  = require('nodemailer');

/**
 * Sends mail to the desired user
 * @function send
 * 
 * @param {Object} users - Array of emails to send message to
 * 
 * @param {Object} message - JSON containing details of message
 * @param {string} message.subject - Subject of email
 * @param {string} message.html - HTML message
 * @param {string} [message.plaintext] - Plaintext alternative if HTML is not supported on user's mail client
 * 
 * @param {sendCallback}
 */

/**
 * Callback after a message is sent
 * @callback sendCallback
 * 
 * @param {Boolean|string} response - True if message successfully sends, a string if an error occurs
 */

function send(users, message, callback) {
    
    // Checks that all required parameters are there
    
    var required = [
        message.subject,
        message.html,
    ];
    
    var dataSet = required.every(elem => typeof elem !== undefined && elem !== '');
    
    if(dataSet) {
        var transporter = nodemailer.createTransport(config.email.URI);

        var mailOptions =
            {
                from      : config.email.fromName + ' <' + config.email.fromEmail + '>',
                to        : users.toString(),
                subject   : message.subject,
                html      : message.html,
            }
        
        // Optional Plaintext
        if(typeof message.plaintext !== undefined) {
            mailOptions.plaintext = message.plaintext;
        }
        
        transporter.sendMail(mailOptions, function(error, info) {
            if(callback && typeof(callback) === "function") {
                if(!error) {
                    callback(true);
                } else {
                    callback('There was an error sending the email!');
                }
            }
        });
        
    } else if(callback && typeof(callback) === "function") {
        callback(error)
    }
}

module.exports.send = send;