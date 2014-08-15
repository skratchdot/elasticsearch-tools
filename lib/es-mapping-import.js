#!/usr/bin/env node
'use strict';

var helpers = require('./helpers');
var fs = require('fs');
var program = require('commander');
var elasticsearch = require('elasticsearch');
var appInfo = require('../package.json');
var async = require('async');

var esOptions = {
	ignoreConflicts: 'Boolean — Specify whether to ignore conflicts while updating the mapping (default: false)',
	timeout: 'Date, Number — Explicit operation timeout',
	masterTimeout: 'Date, Number — Specify timeout for connection to master',
	ignoreUnavailable: 'Boolean — Whether specified concrete indices should be ignored when unavailable (missing or closed)',
	allowNoIndices: 'Boolean — Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes _all string or when no indices have been specified)',
	expandWildcards: 'String — Whether to expand wildcard expression to concrete indices that are open, closed or both.'
};

// setup command line options
program
	.version(appInfo.version, '-v, --version')
	.option('-u, --url <url>', 'the elasticsearch url to connect to')
	.option('-f, --file <file>', 'the file to write data to');
// add es options
for (var key in esOptions) {
	if (esOptions.hasOwnProperty(key)) {
		program.option('--' + key + ' <' + key + '>', 'ES SEARCH OPTION: ' + esOptions[key]);
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
for (var key in esOptions) {
	if (esOptions.hasOwnProperty(key) && program.hasOwnProperty(key)) {
		params[key] = program[key];
	}
}

// read file, and create indexes/mappings
fs.readFile(program.file, 'utf-8', function (err, contents) {
	if (err) {
		helpers.exit(err);
	}
	try {
		var parsedContent = JSON.parse(contents);
	} catch (err) {
		helpers.exit('Cannot parse file: ' + err.toString());
	}
	var indexes = Object.keys(parsedContent);
	var mappings = [];
	var created = [];
	// build our mappings array
	indexes.forEach(function (index) {
		var m = parsedContent[index].mappings;
		// loop through types
		Object.keys(m).forEach(function (type) {
			mappings.push({
				index: index,
				type: type,
				body: m[type]
			});
		});
	});
	console.log('Creating Indexes (if needed):');
	async.eachSeries(mappings, function (mapping, callback) {
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
		console.log('Creating Mappings:');
		async.eachSeries(mappings, function (mapping, callback) {
			// put mapping
			console.log('  [index="' + mapping.index + '",type="' + mapping.type + '"]');
			params.index = mapping.index;
			params.type = mapping.type;
			params.body = mapping.body;
			client.indices.putMapping(params, callback);
		}, function (err) {
			if (err) {
				helpers.exit(err);
			}
			console.log('Done!');
			process.exit();
		});
	});
});
