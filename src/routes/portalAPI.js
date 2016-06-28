/**
 * @file Manages schedule API endpoints
 */

 var portal = require(__dirname + '/../libs/portal.js');

module.exports = function(app) {
    app.post('/portal/test-url', function(req, res) {
        portal.verifyURL(req.body.url, function(err, isValid, url) {
            if(err) {
                var errorMessage = err.message;
            } else {
                var errorMessage = null;
            }
            res.json({
                error: errorMessage,
                valid: isValid,
                url  : url
            });
        });
    });

    app.post('/portal/set-url', function(req, res) {
        portal.setURL(req.session.user, req.body.url, function(err, isValid, validURL) {
            if(err) {
                var errorMessage = err.message;
            } else {
                var errorMessage = null;
            }
            res.json({
                error: errorMessage,
                valid: isValid,
                url  : validURL
            });
        });
    });
}
