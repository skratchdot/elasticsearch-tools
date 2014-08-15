#!/usr/bin/env node
'use strict';

var helpers = require('./helpers');
var fs = require('fs');
var program = require('commander');
var elasticsearch = require('elasticsearch');
var appInfo = require('../package.json');

var esOptions = {
	index: 'String, String[], Boolean — A comma-separated list of index names',
	type: 'String, String[], Boolean — A comma-separated list of document types',
	ignoreUnavailable: 'Boolean — Whether specified concrete indices should be ignored when unavailable (missing or closed)',
	allowNoIndices: 'Boolean — Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes _all string or when no indices have been specified)',
	expandWildcards: 'String — Whether to expand wildcard expression to concrete indices that are open, closed or both.',
	local: 'Boolean — Return local information, do not retrieve the state from master node (default: false)'
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

// empty our file
fs.writeFileSync(program.file, '', 'utf-8');

// get mapping, and write to file
client.indices.getMapping(params, function (error, response) {
	if (error) {
		helpers.exit(error);
	}
	var keys = Object.keys(response);
	fs.appendFileSync(program.file, JSON.stringify(response, null, '  '), 'utf-8');
	console.log('Exporting mappings for: ', keys);
	console.log('Done!');
	process.exit();
});
