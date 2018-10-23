/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/rooms/list/app.js
 */

import ReactTestUtils from 'react-dom/test-utils';
import { jsdom } from 'jsdom'

const expect = require('chai').expect;

const app = require('../../../../view/rooms/list/app.js');

describe('tests/view/rooms/list/app.js', () => {
  const testArr = ['1', '2', '3'];

  it('ok, select element created with 3 options', () => {
    const selectEl = app.createSelectEl(testArr)
    expect(selectEl.tagName).to.equal('SELECT');
    expect(selectEl.childElementCount).to.equal(testArr.length);
    expect(selectEl.value).to.equal('1');
  });

  it('ok, select element created and default value is overwritten', () => {
    const selectEl = app.createSelectEl(testArr, '2')
    expect(selectEl.value).to.equal('2');
  });

  it('ok, constructing url after page filter change', () => {
    const url = app.constructListFilterUrl('page', '3');
    expect(url).to.equal('/rooms?page=3');
  });

  it('ok, constructing url after type filter change (page is reset to 1)', () => {
    const url = app.constructListFilterUrl('type', 'coolName');
    expect(url).to.equal('/rooms?page=1&type=coolName');
  });

  before(() => {
    delete require.cache[require.resolve('../../../../view/rooms/list/app.js')];
    Object.defineProperty(window.location, 'href', {
      value: 'http://localhost:3000/rooms?type=doughnuts'
    });
  });

  it('ok, constructing url after active filter change when type filter is present', () => {
    const testApp = require('../../../../view/rooms/list/app.js');
    const url = testApp.constructListFilterUrl('active', 'false');
    expect(url).to.equal('/rooms?page=1&type=doughnuts&active=false');
  });
});
