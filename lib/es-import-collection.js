#!/usr/bin/env node
'use strict';

var helpers = require('./helpers');
var fs = require('fs');
var program = require('commander');
var elasticsearch = require('elasticsearch');
var LineByLineReader = require('line-by-line');
var appInfo = require('../package.json');
var filesize = require('filesize');
var ProgressBar = require('progress');
var bar;

// instance variables
var isFileDone = false;
var isPaused = false;
var totalLines = 0;
var currentCount = 0;
var currentBatch = '';

// setup command line options
program
	.version(appInfo.version, '-v, --version')
	.option('-u, --url <url>', 'the elasticsearch url to connect to')
	.option('-i, --index <name>', 'the elasticsearch index')
	.option('-t, --type <name>', 'the elasticsearch type')
	.option('-k, --key <name>', 'key field name')
	.option('-f, --file <file>', 'the file to write data to')
	.option('-m, --max <items>', 'the max number of lines to process per batch', parseInt, 500)
	.parse(process.argv);
// validate url and file
helpers.validateUrlAndFile(program);


// validate file exists
if (!fs.existsSync(program.file)) {
	helpers.exit('The file you passed in does not exist.');
}

// validate max items per batch
if (program.max <= 0 || Number.isNaN(program.max)) {
	console.log(program.max);
	helpers.exit('You must pass in a valid --max option');
}
// init client
var client = new elasticsearch.Client({host: program.url});

function processFile(file, callback){

	// declare our bulk import function
	var bulkImport = function (cb) {
		client.bulk({body: currentBatch}, function (err, response) {
			bar.render();
			if (err) {
				helpers.exit(err);
			}
			if (response.error) {
				helpers.exit('When executing bulk query: ' + response.error.toString());
			}
			// reset global variables
			currentCount = 0;
			currentBatch = '';
			// exit or continue processing
			if (isFileDone) {
				console.log('File complete: %s', file);
				callback();
			} else {
				cb();
			}
		});
	};



	var filestats = fs.statSync(file);
	console.log('Pre-Processing file of size: ' + filesize(filestats.size));
	var preprocess = new LineByLineReader(file, { encoding: 'utf8', skipEmptyLines: false });
	preprocess.on('error', helpers.exit);
	preprocess.on('line', function (line) {
		++totalLines;
	});
	preprocess.on('end', function () {
		console.log("totalLines", totalLines);
		bar = new ProgressBar('Processing line :current of :total [:bar] :percent :elapseds', {
			width: 20,
			total: totalLines
		});
		var lr = new LineByLineReader(file, { encoding: 'utf8', skipEmptyLines: false });
		console.log('Starting bulk imports.');
		bar.render();
		lr.on('error', function (err) {
			helpers.exit(err);
		});
		lr.on('line', function (line) {
			bar.tick();
			currentCount++;

			var obj = JSON.parse(line);
			var indexRow = JSON.stringify({ index : { _index : program.index, _type : program.type, _id : obj[program.key] } });
			currentBatch += indexRow + '\n' + line + '\n';
			if (currentCount >= program.max) {
				lr.pause();
				isPaused = true;
				bulkImport(function () {
					isPaused = false;
					lr.resume();
				});
			}
		});
		lr.on('end', function () {
			isFileDone = true;
			if (!isPaused && currentCount > 0) {
				bulkImport();
			}
		});
	});
}

processFile(program.file, function(){
	process.exit();
});
