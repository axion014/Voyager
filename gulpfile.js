const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');
const console = require("console");
const del = require("del");
const glsl = require("gulp-glsl");
const gulp = require('gulp');
const json = require('gulp-jsonminify');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const resolve = require('rollup-plugin-node-resolve');
const rollup = require('rollup');
const uglify = require('gulp-uglify');
const webserver = require("gulp-webserver");

const bundleName = 'voyager.js';
const buildFolder = 'build/';

let cache;

gulp.task('jsbuild', async () => {
	try {
		const bundle = await rollup.rollup({
			input: './src/main.js',
			cache: cache,
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
							modules: false
						}]
					]
				})
			]
		});
		cache = bundle.cache;

		await bundle.write({
			file: buildFolder + bundleName,
			format: 'iife',
			name: 'library',
			sourcemap: true
		});

		return gulp.src(buildFolder + bundleName)
			.pipe(plumber())
			.pipe(uglify())
			.pipe(rename({extname: '.min.js'}))
			.pipe(gulp.dest(buildFolder));
	} catch(e) {
		console.error(e);
	}
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
		.pipe(glsl({format: 'raw'}))
		.pipe(rename({extname: '.min.glsl'}))
		.pipe(gulp.dest('data'));
}

gulp.task(glslminify);

const build = gulp.parallel('jsbuild', 'jsonminify', 'glslminify');

gulp.task('build', build);

gulp.task('jswatch', () => gulp.watch(['src/**/*'], build));
gulp.task('jsonwatch', () => gulp.watch(['data/**/!(*.min).json'], jsonminify));
gulp.task('glslwatch', () => gulp.watch(['data/**/!(*.min).glsl'], glslminify));

gulp.task('watch', gulp.parallel('jswatch', 'jsonwatch', 'glslwatch'));

gulp.task(function open() {
	gulp.src('.')
		.pipe(plumber())
		.pipe(webserver({open: true}))
});

const server = gulp.series('build', gulp.parallel('watch', 'open'));

gulp.task('server', server);

gulp.task('default', server);
