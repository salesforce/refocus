/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

exports.command = function register(username, password) {
  this
    .waitForElementVisible('body', 500)
    .setValue('input[name=username]', username)
    .setValue('input[name=email]', username + '@a.com')
    .setValue('input[name=password]', password)
    .setValue('input[name=repassword]', password)
    .click('button[type=submit]')
    .pause(1000)
    .waitForElementVisible('.slds-lookup__search-input', 1000)

    return this;
};