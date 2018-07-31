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
 * Executes graceful shutdown for each resource when needed.
 *
 * ie. shutdown Kue, clean DB conn, IO, etc.
 *
 * Each module need to create their own graceful method and call it here.
 */
function gracefulShutdown() {
  jobSetup.gracefulShutdown();
}

/**
 * Force app to shutdown after a given ms timeout (@see
 * config/WAITING_SIG_KILL_TIMEOUT) - Default timeout=60sec.
 *
 * After receiving SIGTERM the app will exit automatically if there is no
 * a SIGKILL event fired from the host platform (eg. Heroku).
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
