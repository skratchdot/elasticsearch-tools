#!/usr/bin/env node
'use strict';

var helpers = require('./helpers');
var fs = require('fs');
var vm = require('vm');
var program = require('commander');
var elasticsearch = require('elasticsearch');
var appInfo = require('../package.json');
var ProgressBar = require('progress');
var bar, key;

var esOptions = {
	index: 'a comma-separated list of index names to search; use _all or empty string to perform the operation on all indices',
	type: 'a comma-separated list of document types to search; leave empty to perform the operation on all types',
	body: 'the body to send along with this request.',
	analyzer: 'The analyzer to use for the query string',
	analyzeWildcard: 'specify whether wildcard and prefix queries should be analyzed (default: false)',
	fields: 'a comma-separated list of fields to return as part of a hit (default: "*")',
	from: 'starting offset (default: 0)',
	q: 'query in the Lucene query string syntax',
	routing: 'a comma-separated list of specific routing values',
	scroll: 'specify how long a consistent view of the index should be maintained for scrolled search (default: 1m)',
	size: 'number of hits to return',
	sort: 'a comma-separated list of <field>:<direction> pairs',
	timeout: 'explicit operation timeout'
};

// setup command line options
program
	.version(appInfo.version, '-v, --version')
	.option('-u, --url <url>', 'the elasticsearch url to connect to')
	.option('-f, --file <file>', 'the file to write data to');
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

// setup a default scroll value
if (!program.scroll) {
	program.scroll = '1m';
}

// init client
var client = new elasticsearch.Client({host: program.url});

// build our search object
var search = {
	fields: ['*'],
	_source: true,
	searchType: 'scan'
};
for (key in esOptions) {
	if (esOptions.hasOwnProperty(key) && program.hasOwnProperty(key)) {
		search[key] = program[key];
	}
}
if (!search.hasOwnProperty('body')) {
	search.body = {"query":{"match_all":{}}};
}

// declare our processing functions
var processed = 0;
var processResults = function (error, response) {
	var content = '', index, scrollOptions;
	if (error && typeof response === 'string') {
		console.log('\nattempting to parse invalid json returned from elasticsearch server');
		response = vm.runInThisContext('(function () {return ' + response + ';}());');
		if (typeof response !== 'object') {
			helpers.exit('attempt to parse invalid json as javascript failed.');
		}
	} else if (error) {
		helpers.exit(error);
	}
	if (response.hits.total === 0) {
		helpers.exit('no results were returned, so exiting.');
	}
	// init progress bar if needed
	if (!bar) {
		bar = new ProgressBar('processing :current of :total [:bar] :percent :elapseds', {
			width: 20,
			total: response.hits.total
		});
	}
	bar.render();
	// process results
	response.hits.hits.forEach(function (hit) {
		var meta = {index:{}};
		var doc = hit._source || {};
		var fields = hit.fields || {};
		// build meta
		for (var key in hit) {
			if (hit.hasOwnProperty(key) && key !== '_source' && key !== 'fields') {
				meta.index[key] = hit[key];
			}
		}
		for (key in fields) {
			if (fields.hasOwnProperty(key)) {
				meta.index[key] = fields[key];
			}
		}
		content += JSON.stringify(meta) + '\n' + JSON.stringify(doc) + '\n';
		processed++;
		bar.tick();
	});
	fs.appendFileSync(program.file, content, 'utf-8');
	// continue to scroll
	if (response.hits.total !== processed) {
		scrollOptions = {scrollId: response._scroll_id};
		if (program.scroll) {
			scrollOptions.scroll = program.scroll;
		}
		client.scroll(scrollOptions, processResults);
	} else {
		bar.render();
		console.log('Done!');
		process.exit();
	}
};

// empty our file
fs.writeFileSync(program.file, '', 'utf-8');

// perform our search and start scrolling
client.search(search, processResults);

