// a few helper functions
'use strict';

exports.exit = function(err) {
  var str = JSON.stringify(err).replace(/^error:/i, '');
  console.error('\n  error: ' + str);
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
