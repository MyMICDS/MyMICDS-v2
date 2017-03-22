'use strict';

/**
 * @file Enables static file routes in the /public directory
 */

module.exports = (app, express) => {
	app.use(express.static(__dirname + '/../public'));
}
