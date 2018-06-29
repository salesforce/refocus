/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/rooms/utils/layout.js
 */

const expect = require('chai').expect;
const utils = require('../../../../view/rooms/utils/layout.js');

describe('tests/view/rooms/utils/layout.js', () => {
  it('ok, all bots in layout exist in room', () => {
    const botLayout = {
      leftColumn: ['BOT A', 'BOT B'],
      middleColumn: ['BOT C'],
      rightColumn: ['BOT D', 'BOT E', 'BOT F'],
    };
    const botsInRoom = ['BOT A', 'BOT B', 'BOT C', 'BOT D', 'BOT E', 'BOT F'];
    expect(utils.isValidLayout(botLayout, botsInRoom)).to.equal(true);
  });

  it('fail, some bots in layout do not exist in room', () => {
    const botLayout = {
      leftColumn: ['NOT IN ROOM', 'BOT B'],
      middleColumn: ['BOT C'],
      rightColumn: ['BOT D'],
    };
    const botsInRoom = ['BOT A', 'BOT B'];
    expect(utils.isValidLayout(botLayout, botsInRoom)).to.equal(false);
  });

  it('fail, incorrect format of Bot Layout obj', () => {
    const botLayout = {
      leftCol: ['BOT A', 'BOT B'],
      middleCol: [],
      rightCol: [],
    };
    const botsInRoom = ['BOT A', 'BOT B'];
    expect(utils.isValidLayout(botLayout, botsInRoom)).to.equal(false);
  });
});
