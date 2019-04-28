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

function minify(dest) {
	return gulp.src('./' + dest + '/' + bundleName)
		.pipe(plumber())
		.pipe(uglify())
		.pipe(rename({extname: '.min.js'}))
		.pipe(gulp.dest('./' + dest + '/'));
}

let cache;
async function $build(dest) {
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
			file: './' + dest + '/' + bundleName,
			format: 'iife',
			name: 'library',
			sourcemap: true
		});

		return minify(dest);
	} catch(e) {
		console.error(e);
	}
}

gulp.task('jsbuild', $build.bind(null, 'build'));

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

const test = gulp.parallel('jsonminify', 'glslminify', $build.bind(null, 'test'));
gulp.task('test', test);

gulp.task('build', gulp.parallel('jsbuild', 'jsonminify', 'glslminify'));

gulp.task('jswatch', () => gulp.watch(['src/**/*'], test));
gulp.task('jsonwatch', () => gulp.watch(['data/**/!(*.min).json'], jsonminify));
gulp.task('glslwatch', () => gulp.watch(['data/**/!(*.min).glsl'], glslminify));

gulp.task('watch', gulp.parallel('jswatch', 'jsonwatch', 'glslwatch'));

gulp.task(function open() {
	gulp.src('.')
		.pipe(plumber())
		.pipe(webserver({open: true}))
});

const server = gulp.series('test', gulp.parallel('watch', 'open'));

gulp.task('server', server);

gulp.task('default', server);
