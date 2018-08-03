const userName = 'UI-Test-User';
const testUtils = require('../testUtils.js');

module.exports = {
  /**
   * Creates a new user and then logs into that user with a given browser
   * and redirects to a given url.
   * 
   * @param {Browser} browser
   * @param {String} url 
   */
  loginAndGoToUrl(browser, url) {
    let name;
    return testUtils.createUser(userName)
    .then((user) => {
      name = user.dataValues.name;
      return browser.newPage();
    }).then((page) => {
      return page.goto(url)
      .then(() => page.waitForSelector("input[name=username]"))
      .then(() => page.click("input[name=username]"))
      .then(() => page.type("input[name=username]", name))
      .then(() => page.click("input[name=password]"))
      .then(() => page.type("input[name=password]", userName))
      .then(() => page.click("button[type=submit]"))
      .then(() => {
        return page.waitForNavigation()
      });
    });
  },
}
