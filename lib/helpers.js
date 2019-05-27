// a few helper functions
'use strict';

exports.logError = function(err) {
  var str = JSON.stringify(err).replace(/^error:/i, '');
  console.error('\n  error: ' + str);
};

exports.exit = function(err) {
  exports.logError(err);
  process.exit(1);
};

exports.validateUrlAndFile = function(program) {
  ['url', 'file'].forEach(function(key) {
    if (typeof program[key] !== 'string') {
      exports.exit('You must pass in a valid --' + key + ' option.');
    }
  });
};

exports.integer = function(num) {
  return parseInt(num, 10);
};
