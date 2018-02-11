'use strict';

var helpers = require('./helpers');
var fs = require('fs');
var program = require('commander');
var elasticsearch = require('elasticsearch');
var appInfo = require('../package.json');

exports.indicesExport = function(fnName, exportKey, esOptions) {
  var key;
  // setup command line options
  program
    .version(appInfo.version, '-v, --version')
    .option('-u, --url <url>', 'the elasticsearch url to connect to')
    .option('-f, --file <file>', 'the file to write data to');
  // add es options
  for (key in esOptions) {
    if (esOptions.hasOwnProperty(key)) {
      program.option(
        '--' + key + ' <' + key + '>',
        'ES OPTION: ' + esOptions[key]
      );
    }
  }
  // parse arguments
  program.parse(process.argv);

  // validate url and file
  helpers.validateUrlAndFile(program);

  // init client
  var client = new elasticsearch.Client({ hosts: program.url.split(',') });

  // build our params object
  var params = {};
  for (key in esOptions) {
    if (esOptions.hasOwnProperty(key) && program.hasOwnProperty(key)) {
      params[key] = program[key];
    }
  }

  // empty our file
  fs.writeFileSync(program.file, '', 'utf-8');

  // get mapping, and write to file
  client.indices[fnName](params, function(error, response) {
    if (error) {
      helpers.exit(error);
    }
    var keys = Object.keys(response);
    fs.appendFileSync(
      program.file,
      JSON.stringify(response, null, '  '),
      'utf-8'
    );
    console.log('Exporting ' + exportKey + ' for: ', keys);
    console.log('Done!');
    process.exit();
  });
};
