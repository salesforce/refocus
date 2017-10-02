/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
exports.command = function login(username, password) {
  this
    .waitForElementVisible('body', 500)
    .setValue('input[name=username]', username)
    .setValue('input[name=password]', password)
    .click('button[type=submit]')
};