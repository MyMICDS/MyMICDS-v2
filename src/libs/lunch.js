/**
 * @file Scraps the lunch from the school website
 * @module lunch
 */

var request = require('request');
var cheerio = require('cheerio');

var lunchURL = 'http://www.myschooldining.com/MICDS';
var schools = ['Lower School', 'Middle School', 'Upper School'];

/**
 * Updates the lunch API
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
            parseLunch(body, callback);
        }
    });
}

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
 * @param {Boolean} response - True if success, false if failure
 * @param {Object} lunch - JSON output of lunch, null if failure
 */

function parseLunch(body, callback) {
    var $ = cheerio.load(body);
    var json = [];
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
                    
                    json.push(date);
                    json[date] = [];
                    json[date].push(school);
                    json[date][school] = [];
                    json[date][school].push(categoryTitle);
                    
                    json[date][school]['title'] = lunchTitle;
                    
                    food.forEach(function(singularVersionOfFood) {
                        
                        json[date][school][categoryTitle] = singularVersionOfFood;
                        console.log(date, school, categoryTitle, singularVersionOfFood);
                    });
                    
                });
                
            }
            
        });
        
        if(index + 1 === weekColumns.length) {
            console.log(json);
        }
        
    });
}

updateLunch(function(response) {
    console.log('Response - ' + response);
});