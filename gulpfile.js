/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./gulpfile.js
 *
 * Configure the streaming build system.
 */
const gulp = require('gulp');
const source = require('vinyl-source-stream');
const browserify = require('browserify');
const babelify = require('babelify');
const fs = require('fs');
const chmod = require('gulp-chmod');

const conf = {
  tasks: {
    default: [
      'browserifyViews',
      'movecss',
    ],
  },
  paths: {
    opts: {
      read: false,
    },
    src: [
      './*.js',
      './db/**/*.js',
      './api/**/*.js',
      './view/**/*.js',
      './tests/db/**/*.js',
      './tests/api/**/*.js',
    ],
  },
  view: {
    cssFiles: '/**/*.css',
    dir: './view',
    dest: './public',
    fileName: 'app.js',
  },
  opts: {
    debug: true, // sourcemaps
    cache: {},
    packageCache: {},
    fullPaths: true, // watchify settings
  },
};

/*
 * Browserifies the views, generating output under the designated destination
 * directory.
 */
gulp.task('browserifyViews', () => {

  /*
   * List all app files in a directory, recursively and synchronously.
   * @param {string} dir Path to start searching from.
   * @return {array} results String path to each app file.
   */
  function getAppFiles(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach((file) => {
      file = dir + '/' + file;
      var stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAppFiles(file));
      } else if (file.split('/').pop() === conf.view.fileName) {
        results.push(file);
      }
    });
    return results;
  }

  /*
   * Transforms each app file into an app, including translating JSX to JS.
   * Puts the output js in outputPath.
   *
   * @param {string} pathToApp Path to source app file.
   * @return {Object} bundle Bundled dependencies.
   */
  function rebundle(pathToApp) {

    const props = {
      entries: [pathToApp],
      debug: true,
      transform: [babelify],
    };
    const bundler = browserify(props);
    const outputPath = pathToApp.split('/').splice(2).join('/');

    var stream = bundler.transform('uglifyify').bundle();
    return stream
      .on('error', (err) => {
        console.error(err);
        process.exit(1);
      })
      .pipe(source(outputPath))
      .pipe(gulp.dest(conf.view.dest))
      .once('end', function () {
        console.log('finished building', outputPath);
        if (appFiles.length) {
          rebundle(appFiles.pop());
        } else {
          process.exit(0);
        }
      });
  }

  const appFiles = getAppFiles(conf.view.dir);
  rebundle(appFiles.pop());
});

/*
 * Runs the default tasks.
 */
gulp.task('default', conf.tasks.default, () => {
  process.exit();
});

/*
 * Copies css files over to public.
 */
gulp.task('movecss', () =>
  gulp.src(conf.view.dir + conf.view.cssFiles)
    .pipe(gulp.dest(conf.view.dest))
    .on('end', () => {
      process.exit();
    })
);

/*
 * Copy git pre-commit script to git hooks.
 */
gulp.task('copygitprecommit', () =>
  gulp.src('./scripts/git/pre-commit')
    .pipe(chmod(755))
    .pipe(gulp.dest('./.git/hooks'))
    .on('end', () => {
      process.exit();
    })
);
