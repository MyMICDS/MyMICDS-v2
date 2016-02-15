/**
 * @file Enables static file routes in the /public directory
 * @module assets
 */

module.exports = function(app) {
    app.use('/static', express.static(__dirname + '/../public'));
}