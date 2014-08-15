// a few helper functions

exports.exit = function (str) {
	str = str.toString().replace(/^error:/i, '');
	console.error('  error: ' + str);
	process.exit(1);
};

exports.validateUrlAndFile = function (program) {
	['url', 'file'].forEach(function (key) {
		if (typeof program[key] !== 'string') {
			exports.exit('You must pass in a valid --' + key + ' option.');
		}
	});
};
