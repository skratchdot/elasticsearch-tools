var gulp = require('gulp');
var jshint = require('gulp-jshint');
var async = require('async');
var fs = require('fs');
var exec = require('child_process').exec;

gulp.task('readme', function () {
	var filename = './README.md';
	fs.readFile(filename, 'utf-8', function (err, data) {
		var sections = data.split('\n## Usage: ');
		async.map(sections, function (section, callback) {
			var tool, child;
			// the first section is okay
			if (section === sections[0]) {
				callback(null, section);
			} else {
				section = section.split('### Examples');
				tool = section[0].split('\n')[0];
				child = exec('node ./lib/' + tool + ' --help', function (error, stdout, stderr) {
					callback(error, [
						tool,
						'\n\n### Options\n\n```bash\n',
						tool,
						' --help\n\n',
						stdout.toString().trim(),
						'\n```\n\n### Examples',
						section[1]
					].join(''));
				});
			}
		}, function (err, results) {
		    // results is now an array of stats for each file
			var output = results.join('\n## Usage: ');
			console.log(output);
			fs.writeFile(filename, output, 'utf-8');
		});
	});
});

gulp.task('lint', function () {
	return gulp.src('./lib/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

gulp.task('default', ['readme', 'lint']);

//handle errors
process.on('uncaughtException', function (e) {
	console.error(e);
});
