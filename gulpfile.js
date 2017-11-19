var del = require("del");
var fs = require("fs");
var gulp = require('gulp');
var concat = require('gulp-concat');
var jsonminify = require('gulp-jsonminify');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var webserver = require("gulp-webserver");
gulp.task('default', ['test']);
gulp.task('watch', ['test'], function() {
	gulp.watch(['src/**/*'], ['test']);
});
gulp.task('jsonwatch', ['jsonminify'], function() {
	gulp.watch(['data/**/!(*.min).json'], ['jsonminify']);
});
gulp.task('live', ['watch'], function() {
	gulp.src('.')
	.pipe(plumber())
	.pipe(webserver({open: true, livereload: {
		enable: true, filter: function(filename) {return !filename.match(/src/);}
	}}))
});
gulp.task('server', ['watch', 'jsonwatch', 'open']);
gulp.task('open', function() {
	gulp.src('.')
	.pipe(plumber())
	.pipe(webserver({open: true, livereload: {enable: true, filter: function(filename) {return false;}}}))
});
gulp.task('test', function() {
	var scripts = fs.readFileSync('src/config.txt').toString().split('\n');
	for (var i = 0; i < scripts.length; ++i) {scripts[i] = 'src/' + scripts[i];}
	gulp.src(scripts)
	.pipe(plumber())
	.pipe(concat('re-flight.js'))
	.pipe(gulp.dest('./test/'))
	.pipe(uglify())
	.pipe(rename({extname: '.min.js'}))
	.pipe(gulp.dest('./test/'));
})
gulp.task('build', function() {
	var scripts = fs.readFileSync('src/config.txt').toString().split('\n');
	for ( var i = 0; i < scripts.length; ++i ) {scripts[i] = 'src/' + scripts[i];}
	gulp.src(scripts)
	.pipe(plumber())
	.pipe(concat('re-flight.js'))
	.pipe(gulp.dest('./build/'))
	.pipe(uglify())
	.pipe(rename({extname: '.min.js'}))
	.pipe(gulp.dest('./build/'));
})
gulp.task('jsonminify', function() {
	del.sync(['data/**/*.min.json']);
	gulp.src(['data/**/*.json'])
	.pipe(jsonminify())
	.pipe(rename({extname: '.min.json'}))
	.pipe(gulp.dest('./data/'));
});
