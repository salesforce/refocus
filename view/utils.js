/**
 * view/utils.js
 */
'use strict'; // eslint-disable-line strict

/**
 * [Sets Cookie]
 * @param {[string]} cname  [Cookie name]
 * @param {[string]} cvalue [Cookie value]
 */
function setCookie(cname, cvalue) {
  document.cookie = cname + '=' + cvalue + '; ';
}

/**
 * [Get cookie by name]
 * @param  {[string]} cname [Cookie name]
 * @returns {[string]}       [Cooie value]
 */
function getCookie(cname) {
  const name = cname + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }

    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }

  return '';
}

module.exports = {
  setCookie,
  getCookie,
};
