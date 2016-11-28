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
		add : []
	},
	{
		base: [],
		add : []
	}
];

for(var i = 0; i < tests.length; i++) {
	var results = schedule.ordine(tests[i].base, tests[i].add);
	console.log('Test ' + i + ' = ', results);
}
