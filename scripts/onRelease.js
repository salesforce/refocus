/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./scripts/onRelease.js
 *
 * Executed during the release phase in a heroku environment.
 */
require('../db/migrate'); // Executes db migrations.
