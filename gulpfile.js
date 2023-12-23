const gulp = require('gulp');
const source = require('vinyl-source-stream');
const browserify = require('browserify');
const babelify = require('babelify');
const fs = require('fs');
const chmod = require('gulp-chmod');
const es = require('event-stream');

const conf = {
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

function getAppFiles(dir) {
  const results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    
    if (stat && stat.isDirectory()) {
      results.push(...getAppFiles(file));
    } else if (file.split('/').pop() === conf.view.fileName) {
      results.push(file);
    }
  });

  return results;
}

function rebundle(pathToApp) {
  const tasks = pathToApp.map((entry) => {
    const outputPath = entry.split('/').splice(2).join('/');
    const props = {
      entries: [entry],
      debug: true,
      transform: [babelify],
    };

    const bundle = browserify(props)
      .transform('uglifyify')
      .bundle()
      .on('error', function (err) {
        console.error(err.toString());
        this.emit('end');
      });

    return bundle
      .pipe(source(outputPath))
      .pipe(gulp.dest(conf.view.dest))
      .on('end', () => {
        console.log('finished building', outputPath);
      });
  });

  return es.merge.apply(null, tasks);
}

// Function to check if an object has the expected properties of a Vinyl object
function isVinylObject(obj) {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.path === 'string' &&
    typeof obj.contents === 'object'
  );
}

function browserifyViews(done) {
  const appFiles = getAppFiles(conf.view.dir);

  // Filter out non-JavaScript files
  const jsFiles = appFiles.filter((file) => {
    return file && typeof file === 'object' && typeof file.path === 'string' && file.path.endsWith('.js') && Buffer.isBuffer(file.contents);
  });

  // Log any non-JavaScript files
  const nonJsFiles = appFiles.filter((file) => !jsFiles.includes(file));
  if (nonJsFiles.length > 0) {
    console.warn('Warning: Non-JavaScript files found and ignored:', nonJsFiles);
  }

  // Perform the rebundle and signal completion
  rebundle(jsFiles).on('end', done);
}

/*
 * Copies CSS files over to the 'public' directory.
 */
gulp.task('movecss', () =>
  gulp.src(conf.view.dir + conf.view.cssFiles).pipe(gulp.dest(conf.view.dest))
);

/*
 * Browserify the views, generating output under the designated destination directory.
 */
gulp.task('browserifyViews', browserifyViews);

/*
 * Runs the default tasks.
 */
gulp.task('default', gulp.series('browserifyViews', 'movecss'));

/*
 * Copy the git pre-commit script to git hooks.
 */
gulp.task('copygitprecommit', () =>
  gulp.src('./scripts/git/pre-commit')
    .pipe(chmod(755))
    .pipe(gulp.dest('./.git/hooks'))
);
