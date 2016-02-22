/**
 * Require and make sure you have a config.js initialized
 */

try {
	var config = require(__dirname + '/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.JS.EXAMPLE***');
}

if(!config.expressSessionSecret) {
	throw new Error('***YOU HAVE CREATED A CONFIG.JS PROPERLY, BUT NOT ALL THE INFORMATION IS FILLED OUT***');
}

module.exports = config;