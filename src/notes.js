'use strict';

/**
 * @file Deepstream server that powers MyMICDS Notes
 */

try {
	var config = require(__dirname + '/libs/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

var Deepstream = require('deepstream.io');
var MongoDBStorageConnector = require('deepstream.io-storage-mongodb');
var server = new Deepstream();

server.set('storage', new MongoDBStorageConnector( {
	connectionString: config.mongodb.uri,
	defaultTable: 'notes',
	splitChar: '/'
}));

server.start();
