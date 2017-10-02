exports.command = function login(username, password) {
  this
    .waitForElementVisible('body', 500)
    .setValue('input[name=username]', username)
    .setValue('input[name=password]', password)
    .click('button[type=submit]')
    .pause(1000)
    .waitForElementVisible('.slds-lookup__search-input', 1000)

    return this;
};