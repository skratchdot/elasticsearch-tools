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
	size: 'number of hits to return during each scan',
	sort: 'a comma-separated list of <field>:<direction> pairs',
	timeout: 'explicit operation timeout'
};

var esClientOptions = {
    apiVersion: 'the major version of the Elasticsearch nodes you will be connecting to (default: 2.3)',
    maxRetries: 'how many times should the client try to connect to other nodes before returning a ConnectionFault error (default: 3)',
    requestTimeout: 'milliseconds before an HTTP request will be aborted and retried. This can also be set per request (default: 30000)',
    deadTimeout: 'milliseconds that a dead connection will wait before attempting to revive itself (default: 60000)',
    pingTimeout: 'milliseconds that a ping request can take before timing out (default: 3000)',
    maxSockets: 'maximum number of concurrent requests that can be made to any node (default: 10)',
    minSockets: 'minimum number of sockets to keep connected to a node (default: 10)',
    selector: 'select a connection from the ConnectionPool using roundRobin (default) or random'
};

// setup command line options
program
	.version(appInfo.version, '-v, --version')
	.option('-u, --url <url>', 'comma-separated elasticsearch urls to connect to')
	.option('-f, --file <file>', 'the file to write data to')
	.option('-m, --max <number>', 'the maximum number of items to export. different than the scroll size', parseInt)
	.option('--transformMeta <js>', 'a javascript function that returns an object that is the transformed meta object')
	.option('--transformSource <js>', 'a javascript function that returns an object that is the transformed source object')
	.option('--transformMetaInit <js>', 'a javascript function that returns an init object that contains helpers for the transform function')
	.option('--transformSourceInit <js>', 'a javascript function that returns an init object that contains helpers for the transform function');

// add es options
for (key in esOptions) {
	if (esOptions.hasOwnProperty(key)) {
		program.option('--' + key + ' <' + key + '>', 'ES OPTION: ' + esOptions[key]);
	}
}

// add client options
for (key in esClientOptions) {
    if (esClientOptions.hasOwnProperty(key)) {
        program.option('--' + key + ' <' + key + '>', 'ES CLIENT OPTION: ' + esClientOptions[key]);
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

// these can be strings or the contents of files
['transformMeta', 'transformSource', 'transformMetaInit', 'transformSourceInit'].forEach(function (key) {
	if (program.hasOwnProperty(key) &&
			typeof program[key] === 'string' &&
			fs.existsSync(program[key])) {
		program[key] = fs.readFileSync(program[key], 'utf-8');
	}
});

// get init objects
['transformMetaInit', 'transformSourceInit'].forEach(function (key) {
	if (program.hasOwnProperty(key)) {
		program[key] = vm.runInNewContext('(function () {' + program[key] + ';return {};}());');
	}
});

// init client
var clientConfig = {
	hosts: program.url.split(',')
};
for (key in esClientOptions) {
    if (esClientOptions.hasOwnProperty(key) && program.hasOwnProperty(key)) {
        var value = program[key];
        if (isNaN(value) || key == 'apiVersion') {
            clientConfig[key] = program[key];
        } else {
            clientConfig[key] = parseInt(program[key]);
        }
    }
}

var client = new elasticsearch.Client(clientConfig);
var stdout = program.file == '-';

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

// declare our processing functions
var processed = 0;
var barUpdateSize = 100000;
var processResults = function (error, response) {
    var content = '', hitMax = false, scrollOptions;
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
		var halfAPercent = Math.round(response.hits.total * 0.005);
		if( halfAPercent < barUpdateSize) barUpdateSize = halfAPercent;
		bar = new ProgressBar('processing :current of :total [:bar] :percent :elapseds', {
			width: 20,
			total: response.hits.total
		});
		bar.render();
	}

	// process results
	response.hits.hits.forEach(function (hit) {
		var meta = {index:{}};
		var source = hit._source || {};
		var fields = hit.fields || {};
		// if we passed in a max, stop processing
		if (typeof program.max === 'number' && processed >= program.max) {
			hitMax = true;
			return;
		}
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
		// transform meta
		if (program.transformMeta) {
			meta = vm.runInNewContext('(function () {' + program.transformMeta + ';return data;}());', {
				init: program.transformMetaInit,
				data: meta
			});
		}
		
		// transform source
		if (program.transformSource) {
			source = vm.runInNewContext('(function () {' + program.transformSource + ';return data;}());', {
				init: program.transformSourceInit,
				data: source
			});
		}

		if (typeof meta !== 'object' || typeof source !== 'object') {
			helpers.exit({
				message: 'an invalid bulk item was created after transforming data',
				meta: meta,
				source: source
			});
		}
		delete meta.index._score; // Remove the score, causes errors in ES 2.3 (maybe earlier versions too)
		content += JSON.stringify(meta) + '\n' + JSON.stringify(source) + '\n';
		processed++;
		if( (processed % barUpdateSize) == 0)
			bar.tick(barUpdateSize);
	});
    if (stdout) {
        process.stdout.write(content)
    } else {
        fs.appendFileSync(program.file, content, 'utf-8');
    }
	// continue to scroll
	if (response.hits.total !== processed && !hitMax) {
		scrollOptions = {scrollId: response._scroll_id};
		if (program.scroll) {
			scrollOptions.scroll = program.scroll;
		}
		client.scroll(scrollOptions, processResults);
	} else {
		bar.tick(processed - Math.floor(processed / barUpdateSize)*barUpdateSize);
		console.log('Done!');
		process.exit();
	}
};

if (!stdout) {
    // empty our file
    fs.writeFileSync(program.file, '', 'utf-8');
}

// perform our search and start scrolling
client.search(search, processResults);

