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

const QUIETER_SIZE = 100000;

// setup command line options
program
	.version(appInfo.version, '-v, --version')
	.option('-u, --url <url>', 'the elasticsearch url to connect to')
	.option('-f, --file <file>', 'the file to read data from')
	.option('-m, --max <items>', 'the max number of lines to process per batch (default: 20,000)', helpers.integer, 20000)
	.option('-q, --quieter', 'Only update progress bar every 100,000 lines (runs up to 5x faster)')
	.parse(process.argv);

// validate url and file
helpers.validateUrlAndFile(program);

// validate max items per batch
if (program.max <= 0 || Number.isNaN(program.max)) {
	helpers.exit('You must pass in a valid --max option');
}

// validate file exists
if (!fs.existsSync(program.file)) {
	helpers.exit('The file you passed in does not exist.');
}

// init client
var client = new elasticsearch.Client({host: program.url});

var quieter = program.quieter;

// declare our bulk import function
var bulkImport = function (cb) {
	client.bulk({body: currentBatch}, function (err, response) {
		if(!quieter) bar.render();
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
			console.log('Complete!');
			process.exit();
		} else {
			cb();
		}
	});
};

var filestats = fs.statSync(program.file);
console.log('Pre-Processing file of size: ' + filesize(filestats.size));
var preprocess = new LineByLineReader(program.file, { encoding: 'utf8', skipEmptyLines: false });
preprocess.on('error', helpers.exit);
preprocess.on('line', function () {
	totalLines++;
});
preprocess.on('end', function () {
    bar = new ProgressBar('Processing line :current of :total [:bar] :percent :elapseds', {
        width: 20,
        total: totalLines
    });
	var lr = new LineByLineReader(program.file, { encoding: 'utf8', skipEmptyLines: false });
    var totalLinesProcessed  = 0;
	console.log("Starting bulk imports with batches of " + program.max + " lines.");
	bar.render();
	lr.on('error', function (err) {
		helpers.exit(err);
	});
	lr.on('line', function (line) {
        totalLinesProcessed++;
		if(!quieter) bar.tick();
        else if( (totalLinesProcessed % QUIETER_SIZE) == 0 )
           bar.tick(QUIETER_SIZE);
		currentCount++;
		currentBatch += line + '\n';
		if (currentCount >= program.max && currentCount % 2 === 0) {
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
        if(quieter) bar.tick(totalLinesProcessed - Math.floor(totalLinesProcessed / QUIETER_SIZE)*QUIETER_SIZE);
		if (!isPaused && currentCount > 0) {
			bulkImport();
		}
	});
});
