'use strict';

/**
 * @file Compiles Sass files. That's it.
 * @module sass
 */

var fs   = require('fs');
var path = require('path');
var sass = require('node-sass');

// Valid file extentions Sass can compile
var validSassExt = [
	'.css',
	'.scss'
];

/**
 * Renders a Sass file and outputs to a directory
 * @function renderFile
 *
 * @param {string} sassDir - Path to .scss file you want to compile
 * @param {string} cssDir - Directory you want the Sass files to compile to
 * @param {renderFileCallback} callback - Callback
 */

/**
 * Calls back whether success or error compiling Sass file
 * @callback renderFileCallback
 *
 * @param {Object} err - Null if successful, error object if error
 */

function renderFile(sassFile, cssDir, callback) {

	if(typeof callback !== 'function') {
		callback = function() {};
	}

	// Don't render files beginning in underscore (_)
	var fileMeta = path.parse(sassFile);
	if(fileMeta.name.substr(0, 1) === '_') {
		callback(null);
		return;
	}

	// Compile Sass
	sass.render({
		file: sassFile
	}, function(sassErr, result) {

		if(sassErr) {
			callback(sassErr);
			return;
		}

		// Write Sass to file
		var filename = fileMeta.base.replace('.scss', '.css');
		var pathname = cssDir + '/' + filename;
		fs.writeFile(pathname, result.css, function(writeErr) {
			if(writeErr) {
				callback(writeErr);
			} else {
				callback(null);
			}
		});
	});
}

/**
 * Renders all files in a directory
 * @function renderDir
 *
 * @param {string} sassDir - Path to .scss files you want to compile
 * @param {string} cssDir - Directory you want the Sass files to compile to
 */

function renderDir(sassDir, cssDir) {
	// Get all files in directory
	fs.readdir(sassDir, function(readErr, files) {
		files.forEach(function(file, index) {
			var fileMeta = path.parse(file);
			// See if valid file extention
			if(validSassExt.indexOf(fileMeta.ext) > -1) {
				// Render file if valid
				renderFile(sassDir + '/' + fileMeta.base, cssDir, function(renderErr) {
					if(renderErr) {
						console.log('Uh oh! Failed to compile ' + fileMeta.base + '! Error: ' + renderErr.message);
					}
				});
			}
		});
	});
}

/**
 * Watches a directory for any changes and compiles this new Sass
 * @function watchDir
 *
 * @param {string} sassDir - Directory you want to watch all Sass files
 * @param {string} cssDir - Directory you want all Sass files to compile to
 */

function watchDir(sassDir, cssDir) {
	fs.watch(sassDir, function(event, filename) {
		// Check if valid Sass extention
		var fileMeta = path.parse(filename);
		if(validSassExt.indexOf(fileMeta.ext) > -1) {
			renderFile(sassDir + '/' + filename, cssDir, function(renderErr) {
				if(renderErr) {
					console.log('Uh oh! Failed to compile ' + filename + '! Error: ' + renderErr.message);
				}
			});
		}
	});
}

module.exports.renderFile = renderFile;
module.exports.renderDir  = renderDir;
module.exports.watchDir   = watchDir;
