/**
 * @file Scraps the lunch from the school website
 * @module lunch
 */

var fs      = require('node-fs-extra');
var request = require('request');
var cheerio = require('cheerio');

var lunchURL = 'http://www.myschooldining.com/MICDS';
var schools = ['Lower School', 'Middle School', 'Upper School'];

/**
 * Takes the body of the school's lunch page and returns JSON
 * @function parseLunch
 * 
 * @param {string} body - Body of HTML
 * @param {parseLunchCallback}
 */

/**
 * Callback after the lunch data is parsed
 * @callback parseLunchCallback
 * 
 * @param {Object} lunch - JSON output of lunch
 */

function parseLunch(body, callback) {
    var $ = cheerio.load(body);
    var json = {};
    json['info'] = 'Visit https://mymicds.net/api for more information!';
    
    var table       = $('table#table_calendar_week');
    var weekColumns = table.find('td');
    
    weekColumns.each(function(index) {
        
        var day  = $(this);
        var date = day.attr('day_no');
        
        schools.forEach(function(school) {
            
            var schoolLunch = day.find('div[location="' + school + '"]');
            
            // Make sure it's not the weekend
            
            if(schoolLunch.length > 0) {
                
                var lunchTitle = schoolLunch.find('span.period-value').text().trim();
                var categories = schoolLunch.find('div.category-week');
                
                categories.each(function() {
                    
                    var category      = $(this);
                    var food          = [];
                    var categoryTitle = category.find('span.category-value').text().trim();
                    var items         = category.find('div.item-week');
                    
                    items.each(function() {
                        food.push($(this).text().trim());
                    });
                    
                    // Add to JSON
                    
                    json[date] = json[date] || {};
                    json[date][school] = json[date][school] || {};
                    
                    json[date][school]['title'] = lunchTitle;
                    
                    json[date][school][categoryTitle] = json[date][school][categoryTitle] || [];
                    
                    food.forEach(function(singularVersionOfFood) {
                        json[date][school][categoryTitle].push(singularVersionOfFood);
                    });
                    
                });
                
            }
            
        });
        
    });
    
    callback(json);
}

/**
 * Updates the lunch API and writes it into a JSON file
 * @function updateLunch
 * 
 * @param {updateLunchCallback}
 */

/**
 * Callback after the updateLunch function
 * @callback updateLunchCallback
 * 
 * @param {Boolean} response - True if success, false if failure
 */

function updateLunch(callback) {
    request(lunchURL, function(error, response, body) {
        if(!error) {
            parseLunch(body, function(response) {
                fs.mkdirs(__dirname + '/../api', function(err) {
                    if(!err) {
                        fs.writeJSON(__dirname + '/../api/lunch.json', response, function(err) {
                            if(!err) {
                                callback(true);
                            } else {
                                callback(false);
                            }
                        });
                    } else {
                        callback(false);
                    }
                });
                
            });
        } else {
            callback(false);
        }
    });
}

module.exports.parseLunch  = parseLunch;
module.exports.updateLunch = updateLunch;