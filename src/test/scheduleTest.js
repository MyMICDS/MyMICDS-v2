'use strict';

const schedule = require(__dirname + '/../libs/schedule.js');
const moment = require('moment');

// Array containing classes to test
const tests = [
	{
		base: [],
		add: [{
			class: 'class 1',
			start: moment().hour(8).minute(0),
			end: moment().hour(9).minute(0)
		}, {
			class: 'class 2',
			start: moment().hour(8).minute(0),
			end: moment().hour(9).minute(0)
		}]
	},
	{
		base: [],
		add: [{
			class: 'class 1',
			start: moment().hour(8).minute(0),
			end: moment().hour(9).minute(0)
		}, {
			class: 'class 2',
			start: moment().hour(8).minute(30),
			end: moment().hour(8).minute(45)
		}]
	},
	{
		base: [],
		add: [{
			class: 'class 1',
			start: moment().hour(8).minute(0),
			end: moment().hour(9).minute(0)
		}, {
			class: 'class 2',
			start: moment().hour(7).minute(0),
			end: moment().hour(8).minute(45)
		}]
	},
	{
		base: [],
		add: [{
			class: 'class 1',
			start: moment().hour(8).minute(0),
			end: moment().hour(9).minute(0)
		}, {
			class: 'class 2',
			start: moment().hour(8).minute(30),
			end: moment().hour(10).minute(0)
		}]
	},
	{
		base: [],
		add: [{
			class: 'class 1',
			start: moment().hour(8).minute(30),
			end: moment().hour(8).minute(45)
		}, {
			class: 'class 2',
			start: moment().hour(8).minute(0),
			end: moment().hour(9).minute(0)
		}]
	},
	{
		base: [],
		add: []
	}
];

for(const test of tests) {
	const results = schedule.ordine(test.base, test.add);

	// Convert moment.js objects to readable strings
	for(const result of results) {
		if(moment.isMoment(result.start)) {
			result.start = result.start.format('LT');
		}
		if(moment.isMoment(result.end)) {
			result.end = result.end.format('LT');
		}
	}

	console.log('Test ' + i + ' = ', results);
}
