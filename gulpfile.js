const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');
const console = require("console");
const del = require("del");
const glsl = require("gulp-glsl");
const gulp = require('gulp');
const json = require('gulp-jsonminify');
const through = require('through');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const resolve = require('rollup-plugin-node-resolve');
const rollup = require('rollup');
const uglify = require('gulp-uglify');
const webserver = require("gulp-webserver");

function minify(dest) {
	return gulp.src('./' + dest + '/re-flight.js')
		.pipe(plumber())
		.pipe(uglify())
		.pipe(rename({extname: '.min.js'}))
  	.pipe(gulp.dest('./' + dest + '/'));
}

async function $build(dest) {
	try {
		const bundle = await rollup.rollup({
    	input: './src/main.js',
    	plugins: [
				resolve(),
				babel({
					plugins: [
						'@babel/plugin-proposal-class-properties'
					]
				}),
				commonjs(),
				babel({
					presets: [
						["@babel/preset-env", {
      				"modules": false
    				}]
					]
				})
    	]
  	});

		await bundle.write({
    	file: './' + dest + '/re-flight.js',
    	format: 'iife',
    	name: 'library',
    	sourcemap: true
  	});

		return minify(dest);
	} catch(e) {
		console.error(e);
	}
}

gulp.task('jsbuild', function() {
	return $build('build');
});

function jsonminify() {
	del.sync(['data/**/*.min.json']);
	return gulp.src(['data/**/*.json'])
		.pipe(plumber())
		.pipe(json())
		.pipe(rename({extname: '.min.json'}))
		.pipe(gulp.dest('./data/'));
}

gulp.task(jsonminify);

function glslminify() {
	return gulp.src('data/**/!(*.min).glsl')
		.pipe(plumber())
		.pipe(glsl())
		.pipe(rename({extname: '.min.glsl'}))
  	.pipe(gulp.dest('data'));
}

gulp.task(glslminify);

const test = gulp.parallel('jsonminify', 'glslminify', function() {
	return $build('test');
});

gulp.task('test', test);

gulp.task('build', gulp.parallel('jsbuild', 'jsonminify', 'glslminify'));

gulp.task('jswatch', function() {
	return gulp.watch(['src/**/*'], test);
});
gulp.task('jsonwatch', function() {
	return gulp.watch(['data/**/!(*.min).json'], jsonminify);
});
gulp.task('glslwatch', function() {
	return gulp.watch(['data/**/!(*.min).glsl'], glslminify);
});
gulp.task('watch', gulp.parallel('jswatch', 'jsonwatch', 'glslwatch'));

gulp.task('live', gulp.series('test', gulp.parallel('watch', function() {
	gulp.src('.')
		.pipe(plumber())
		.pipe(webserver({open: true, livereload: {
			enable: true, filter: function(filename) {return !filename.match(/src/);}
		}}))
})));

gulp.task(function open() {
	gulp.src('.')
		.pipe(plumber())
		.pipe(webserver({open: true, livereload: {enable: true, filter: function(filename) {return false;}}}))
});

const server = gulp.series('test', gulp.parallel('watch', 'open'));

gulp.task('server', server);

gulp.task('default', server);
