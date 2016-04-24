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
 * @param {string|Object} users - Single email string, OR an array of multiple emails
 * 
 * @param {Object} message - JSON containing details of message
 * @param {string} message.subject - Subject of email
 * @param {string} message.html - HTML message
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
            from   : config.email.fromName + ' <' + config.email.fromEmail + '>',
            to     : users.toString(),
            subject: message.subject,
            html   : message.html,
        }
        
        // Optional Plaintext
        if(typeof message.plaintext !== undefined) {
            mailOptions.plaintext = message.plaintext;
        }
        
        transporter.sendMail(mailOptions, function(error, info) {
            if(callback && typeof(callback) === 'function') {
                if(!error) {
                    callback(true);
                } else {
                    callback('There was an error sending the email!');
                }
            }
        });
        
    } else if(callback && typeof(callback) === 'function') {
        callback(error)
    }
}

/**
 * Sends an email with supplied HTML file, can insert custom data into HTML file
 * @function sendHTML
 * 
 * @param {string|Object} users - Single email string, OR an array of multiple emails
 * @param {string} subject - Subject of email
 * @param {string} file - Path to HTML file
 * @param {Object} data - JSON of custom data. (Ex. Replace '{{firstName}}' in HTML by putting 'firstName: Michael' in the JSON)
 * @param {sendHTMLCallback}
 */

/**
 * Callback after sending the HTML email
 * @callback sendHTMLCallback
 * 
 * @param {Boolean|string} response - True if message successfully sends, a string if an error occurs
 */

function sendHTML(users, subject, file, data, callback) {
    fs.readFile(file, 'utf8', function(err, body) {
        if(!err) {
            
            // Replace JSON Key values with custom data
            
            for(var key in data) {
                body = body.replace('{{' + key + '}}', data[key]);
            }
            
            var mesesage =
                {
                    subject: subject,
                    html   : body,
                }
            
            if(callback && typeof(callback) === 'function') {
                send(users, mesesage, callback);
            } else {
                send(users, mesesage);
            }
            
        } else if(callback && typeof(callback) === 'function') {
            callback('An error occured reading the HTML file at specified path!');
        }
    });
}

module.exports.send     = send;
module.exports.sendHTML = sendHTML;