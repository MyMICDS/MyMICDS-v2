/**
 * @file Enables static file routes in the /public directory
 */

module.exports = function(app, express) {
    app.use('/static', express.static(__dirname + '/../public'));
}