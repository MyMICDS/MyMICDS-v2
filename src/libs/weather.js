/**
 * @file Gets weather from forecast.io
 * @module weather
 */

var config   = require(__dirname + '/requireconfig.js');
var Forecast = require('forecast.io');
var fs       = require('node-fs-extra');

var JSONPath = __dirname + '/../public/json/weather.json';

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
    fs.readJSON(JSONPath, function(err, weatherJSON) {
        if(!err) {
            callback(weatherJSON);
        } else {
            updateWeather(callback);
        }
    });
}

/**
 * Get's weather from forecast.io and returns JSON
 * @function updateWeather
 * 
 * @param {updateWeatherCallback}
 * @param {Object} [io] - socket.io object, to emit a 'weather' event with JSON for clients to update
 */

/**
 * Callback after it gets the weather
 * @callback updateWeatherCallback
 * 
 * @param {Object|Boolean} weatherJSON - JSON of current weather or false if failure
 */

function updateWeather(callback, io) {
    var forecast = new Forecast(options);

    forecast.get(latitude, longitude, function(err, res, data) {
        if(!err) {
            fs.outputJSON(JSONPath, data, function(err) {
                if(!err) {
                    if(io) {
                        io.emit('weather', data);
                    }
                    callback(data);
                    
                } else {
                    callback(false);
                }
            });
        } else {
            callback(false);
        }
    });
    
}

module.exports.getWeather    = getWeather;
module.exports.updateWeather = updateWeather;