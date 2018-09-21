/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/rooms/utils/page.js
 */

const expect = require('chai').expect;
const uPage = require('../../../../view/rooms/utils/page.js');

describe('tests/view/rooms/utils/page.js', () => {
  it('ok, <img> Element created wrapped in <a> element', () => {
    const url = 'http://google.com/';
    const el = uPage.createFooterLinkedSvg('', url);
    expect(el.tagName).to.equal('A');
    expect(el.href).to.equal(url);
    expect(el.firstChild.tagName).to.equal('svg');
  });
});
