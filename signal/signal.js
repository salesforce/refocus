/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

const jobSetup = require('../jobQueue/setup');
const WAITING_SIG_KILL_TIMEOUT = require('../config').WAITING_SIG_KILL_TIMEOUT;

/**
 * Executes graceful shutdown per each module when needed.
 *
 * ie. shutdown Kue, clean DB conn, etc.
 *
 * Each module need to create their own graceful method and be executed here.
 */
function gracefulShutdown() {
  jobSetup.gracefulShutdown();
}

/**
 * After receiving SIGTERM the app will exit automatically if there is no
 * a SIGKILL event fired from the host platform (eg. Heroku) in
 * WAITING_SIG_KILL_TIMEOUT seconds.
 *
 * default=60sec
 */
function forceShutdownTimeout() {
  setTimeout(() => {
    process.exit(0);
  }, WAITING_SIG_KILL_TIMEOUT);
}

module.exports = {
  gracefulShutdown,
  forceShutdownTimeout,
};
