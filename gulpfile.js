/**
 * ./gulpfile.js
 *
 * Configure the streaming build system.
 */
const gulp = require('gulp');
const jscs = require('gulp-jscs');
const source = require('vinyl-source-stream');
const browserify = require('browserify');
const babelify = require('babelify');
const path = require('path');
const fs = require('fs');

const conf = {
  tasks: {
    default: [
      'browserifyViews',
      'movecss',
      'movesocket',
      'style',
      'moveGridLens',
      'movelensutil',
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

    var stream = bundler.bundle();
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
 * Moves socket io client side js to public folder
 */
gulp.task('movesocket', () =>
  gulp.src('./node_modules/socket.io-client/socket.io.js')
    .pipe(gulp.dest(conf.view.dest))
    .on('end', () => {
      process.exit();
    })
);

/*
 * Moves grid lens to public folder.
 * TODO remove this once lenses are installed as data
 */
gulp.task('moveGridLens', () =>
  gulp.src(['./view/focusGrid/bundle.js', './view/focusGrid/focus.pug'])
    .pipe(gulp.dest(conf.view.dest + '/focusGrid'))
    .on('end', () => {
      process.exit();
    })
);

/*
 * Moves lensUtils client side js to public folder
 */
gulp.task('movelensutil', () =>
  gulp.src('./view/lensPerspective/perspective/lensUtils.js')
    .pipe(gulp.dest(conf.view.dest))
    .on('end', () => {
      process.exit();
    })
);

/*
 * Checks code using airbnb style guide.
 */
gulp.task('style', () =>
  gulp.src(conf.paths.src)
    .pipe(jscs())
    .pipe(jscs.reporter())
    .on('end', () => {
      process.exit();
    })
);

/*
 * Runs default tasks on any changes to src.
 */
gulp.task('watch', () =>
  gulp.watch(conf.paths.src, ['browserifyViews', 'movecss', 'movesocket'])
);
