var del = require("del");
var fs = require("fs");
var glob = require("glob")
var gulp = require('gulp');
var concat = require('gulp-concat');
var jsonminify = require('gulp-jsonminify');
var through = require('through');
var glslminifystream = require("glsl-transition-minify");
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var webserver = require("gulp-webserver");

function glslminify (source) {
  var strm = through();
  var res = "";
  glslminifystream(strm).on("data", function (glsl) { res += glsl; });
  strm.write(source);
  strm.end();
  return res;
}

gulp.task('default', ['test']);
gulp.task('watch', ['test'], function() {
	gulp.watch(['src/**/*'], ['test']);
});
gulp.task('jsonwatch', ['jsonminify'], function() {
	gulp.watch(['data/**/!(*.min).json'], ['jsonminify']);
});
gulp.task('glslwatch', ['glslminify'], function() {
	gulp.watch(['data/**/!(*.min).glsl'], ['glslminify']);
});
gulp.task('fullwatch', ['watch', 'jsonwatch', 'glslwatch']);
gulp.task('live', ['watch'], function() {
	gulp.src('.')
	.pipe(plumber())
	.pipe(webserver({open: true, livereload: {
		enable: true, filter: function(filename) {return !filename.match(/src/);}
	}}))
});
gulp.task('server', ['fullwatch', 'open']);
gulp.task('open', function() {
	gulp.src('.')
	.pipe(plumber())
	.pipe(webserver({open: true, livereload: {enable: true, filter: function(filename) {return false;}}}))
});
function build(dest) {
	var scripts = fs.readFileSync('src/config.txt').toString().split('\n');
	for (var i = 0; i < scripts.length; ++i) {scripts[i] = 'src/' + scripts[i];}
	gulp.src(scripts)
		.pipe(plumber())
		.pipe(concat('re-flight.js'))
		.pipe(gulp.dest('./' + dest + '/'))
		.pipe(uglify())
		.pipe(rename({extname: '.min.js'}))
		.pipe(gulp.dest('./' + dest + '/'));
}
gulp.task('test', function() {
	build('test');
});
gulp.task('build', function() {
	build('build');
});
gulp.task('jsonminify', function() {
	del.sync(['data/**/*.min.json']);
	gulp.src(['data/**/*.json'])
	.pipe(jsonminify())
	.pipe(rename({extname: '.min.json'}))
	.pipe(gulp.dest('./data/'));
});

gulp.task('glslminify', function() {
	var glsls = glob.sync('data/**/!(*.min).glsl');
	for (var i = 0; i < glsls.length; ++i) {
		fs.writeFileSync(glsls[i].replace('.glsl', '.min.glsl'), glslminify(fs.readFileSync(glsls[i]).toString()));
	}
});
