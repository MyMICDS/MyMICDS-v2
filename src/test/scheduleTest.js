'use strict';

var schedule = require(__dirname + '/../libs/schedule.js');
var moment   = require('moment');

// Array containing classes to test
var tests = [
	{
		base: [],
		add : [{
			class: 'class 1',
			start: moment().hour(8).minute(0),
			end  : moment().hour(9).minute(0)
		}, {
			class: 'class 2',
			start: moment().hour(8).minute(0),
			end  : moment().hour(9).minute(0)
		}]
	},
	{
		base: [],
		add : [{
			class: 'class 1',
			start: moment().hour(8).minute(0),
			end  : moment().hour(9).minute(0)
		}, {
			class: 'class 2',
			start: moment().hour(8).minute(30),
			end  : moment().hour(8).minute(45)
		}]
	},
	{
		base: [],
		add : [{
			class: 'class 1',
			start: moment().hour(8).minute(0),
			end  : moment().hour(9).minute(0)
		}, {
			class: 'class 2',
			start: moment().hour(7).minute(0),
			end  : moment().hour(8).minute(45)
		}]
	},
	{
		base: [],
		add : [{
			class: 'class 1',
			start: moment().hour(8).minute(0),
			end  : moment().hour(9).minute(0)
		}, {
			class: 'class 2',
			start: moment().hour(8).minute(30),
			end  : moment().hour(10).minute(0)
		}]
	},
	{
		base: [],
		add : [{
			class: 'class 1',
			start: moment().hour(8).minute(30),
			end  : moment().hour(8).minute(45)
		}, {
			class: 'class 2',
			start: moment().hour(8).minute(0),
			end  : moment().hour(9).minute(0)
		}]
	},
	{
		base: [],
		add : []
	}
];

for(var i = 0; i < tests.length; i++) {
	var results = schedule.ordine(tests[i].base, tests[i].add);

	// Convert moment.js objects to readable strings
	for(var j = 0; j < results.length; j++) {
		if(moment.isMoment(results[j].start)) {
			results[j].start = results[j].start.format('LT');
		}
		if(moment.isMoment(results[j].end)) {
			results[j].end = results[j].end.format('LT');
		}
	}

	console.log('Test ' + i + ' = ', results);
}
