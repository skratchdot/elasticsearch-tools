'use strict';

var helpers = require('./helpers');
var fs = require('fs');
var program = require('commander');
var elasticsearch = require('elasticsearch');
var appInfo = require('../package.json');
var async = require('async');

exports.indicesImport = function (fnName, importKey, alsoInclude, esOptions) {
	var key;
	// setup command line options
	program
		.version(appInfo.version, '-v, --version')
		.option('-u, --url <url>', 'the elasticsearch url to connect to')
		.option('-f, --file <file>', 'the file to read data from');
	// add es options
	for (key in esOptions) {
		if (esOptions.hasOwnProperty(key)) {
			program.option('--' + key + ' <' + key + '>', 'ES OPTION: ' + esOptions[key]);
		}
	}
	// parse arguments
	program.parse(process.argv);

	// validate url and file
	helpers.validateUrlAndFile(program);

	// init client
	var client = new elasticsearch.Client({host: program.url});

	// build our params object
	var params = {};
	for (key in esOptions) {
		if (esOptions.hasOwnProperty(key) && program.hasOwnProperty(key)) {
			params[key] = program[key];
		}
	}

	// read file, and create indexes / keyValues
	fs.readFile(program.file, 'utf-8', function (err, contents) {
		var parsedContent;
		if (err) {
			helpers.exit(err);
		}
		try {
			parsedContent = JSON.parse(contents);
		} catch (err) {
			helpers.exit('Cannot parse file: ' + err.toString());
		}
		var indexes = Object.keys(parsedContent);
		var keyValues = [];
		var created = [];
		// build our keyValues array
		indexes.forEach(function (index) {
			var currentObj = parsedContent[index][importKey];
			// loop through properties
			Object.keys(currentObj).forEach(function (prop) {
				keyValues.push({
					index: index,
					prop: prop,
					body: currentObj[prop]
				});
			});
		});
		console.log('Creating Indexes (if needed):');
		async.eachSeries(keyValues, function (mapping, callback) {
			var prefix = '  [index="' + mapping.index + '"]';
			if (created.indexOf(mapping.index) >= 0) {
				callback();
			} else {
				created.push(mapping.index);
				client.indices.exists({index: mapping.index}, function (error, response) {
					if (err) {
						callback(err);
					} else if (response) {
						console.log(prefix + ' - exists');
						callback();
					} else {
						console.log(prefix + ' - creating');
						client.indices.create({index: mapping.index}, callback);
					}
				});
			}
		}, function (err) {
			if (err) {
				helpers.exit(err);
			}
			console.log('Creating ' + importKey + ':');
			async.eachSeries(keyValues, function (mapping, callback) {
				// put mapping
				console.log('  [index="' + mapping.index + '", prop="' + mapping.prop + '"]');
				params.index = mapping.index;
				if (typeof alsoInclude === 'string') {
					params[alsoInclude] = mapping.prop;
				}
				params.body = mapping.body;
				client.indices[fnName](params, callback);
			}, function (err) {
				if (err) {
					helpers.exit(err);
				}
				console.log('Done!');
				process.exit();
			});
		});
	});
};
