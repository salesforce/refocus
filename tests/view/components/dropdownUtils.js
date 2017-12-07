/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/dropdownUtils.js
 */
const expect = require('chai').expect;
const getMatches = require('../../../view/admin/components/common/dropdownUtils.js').getMatches;

describe('ordered items with different cases', () => {
  const ordered = ["AAAAA", "Az", "BB", "Be", "a", "aaaaaaaa"];
  it('multiple matches across different cases', () => {
    const results = getMatches(ordered, "a");
    expect(results.length).to.equal(4);
  });
});

describe('begins with', () => {
  const words = ["aaa", "ba", "bb", "ccc", "cd", "code", "in", "perspective"];
  it('no match', () => {
    const results = getMatches(words, "volvo");
    expect(results.length).to.equal(0);
  });

  it('one match in periphery', () => {
    const results = getMatches(words, "pers");
    expect(results.length).to.equal(1);
  });

  it('one match in middle', () => {
    const results = getMatches(words, "i");
    expect(results.length).to.equal(1);
  });

  it('multiple matches', () => {
    const results = getMatches(words, "b");
    expect(results.length).to.equal(2);
  });
});

describe('exact match', () => {
  const items = ["a", "b", "c", "d", "e", "f",
    "g", "h", "i", "i", "j", "j", "j"
  ];

  it('single match is returned', () => {
    const results = getMatches(items, "b");
    expect(results.length).to.equal(1);
  });

  it('multiple matches are returned', () => {
    const results = getMatches(items, "j");
    expect(results.length).to.equal(3);
  });
});
