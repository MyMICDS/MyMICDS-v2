/**
 * @file Gets weather from forecast.io
 * @module weather
 */

var config   = require(__dirname + '/requireConfig.js');
var Forecast = require('forecast.io');

var latitude  = 38.658241;
var longitude = -90.3974471;

var options =
    {
        APIKey: config.forecastAPIKey
    }

/**
 * Get's weather from forecast.io and returns JSON
 * @function getWeather
 * 
 * @param {getWeatherCallback}
 */

/**
 * Callback after it gets the weather
 * @callback getWeatherCallback
 * 
 * @param {Object|Boolean} weatherJSON - JSON of current weather or false if failure
 */

function getWeather(callback) {
    var forecast = new Forecast(options);

    forecast.get(latitude, longitude, function(err, res, data) {
        if(!err) {
            callback(data);
        } else {
            callback(false);
        }
    });
}

module.exports.getWeather = getWeather;