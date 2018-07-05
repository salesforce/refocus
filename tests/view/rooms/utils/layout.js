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
const sinon = require('sinon');
const uLayout = require('../../../../view/rooms/utils/layout.js');
const uView = require('../../../../view/utils.js');

const leftColumn = document.createElement('div')
const middleColumn = document.createElement('div');
const rightColumn = document.createElement('div');
const botA = document.createElement('div');
const botB = document.createElement('div');
leftColumn.appendChild(botA);
leftColumn.appendChild(botB);

describe('tests/view/rooms/utils/layout.js', () => {
  describe('validating botLayout objects', () => {
    it('ok, all bots in layout exist in room', () => {
      const botLayout = {
        leftColumn: ['BOT A', 'BOT B'],
        middleColumn: ['BOT C'],
        rightColumn: ['BOT D', 'BOT E', 'BOT F'],
      };
      const botsInRoom = ['BOT A', 'BOT B', 'BOT C', 'BOT D', 'BOT E', 'BOT F'];
      expect(uLayout.isValidLayout(botLayout, botsInRoom)).to.equal(true);
    });

    it('fail, some bots in layout do not exist in room', () => {
      const botLayout = {
        leftColumn: ['NOT IN ROOM', 'BOT B'],
        middleColumn: ['BOT C'],
        rightColumn: ['BOT D'],
      };
      const botsInRoom = ['BOT A', 'BOT B'];
      expect(uLayout.isValidLayout(botLayout, botsInRoom)).to.equal(false);
    });

    it('fail, incorrect format of Bot Layout obj', () => {
      const botLayout = {
        leftCol: ['BOT A', 'BOT B'],
        middleCol: [],
        rightCol: [],
      };
      const botsInRoom = ['BOT A', 'BOT B'];
      expect(uLayout.isValidLayout(botLayout, botsInRoom)).to.equal(false);
    });
  });

  describe('getting botLayout from the page', () => {
    beforeEach(() => {
      sinon.stub(document, 'getElementById');
    });

    afterEach(() => {
      document.getElementById.restore();
    });

    it('ok, layout exists on the page', () => {
      document.getElementById.withArgs('botsLeftColumn')
        .returns(leftColumn);
      document.getElementById.withArgs('botsMiddleColumn')
        .returns(middleColumn);
      document.getElementById.withArgs('botsRightColumn')
        .returns(rightColumn);
      const layout = uLayout.getBotLayoutFromPage();
      expect(layout.leftColumn.length).to.equal(2);
      expect(layout.middleColumn.length).to.equal(0);
      expect(layout.rightColumn.length).to.equal(0);
    });

    it('ok, layout does not exist on page so it is empty', () => {
      const layout = uLayout.getBotLayoutFromPage();
      expect(layout.leftColumn.length).to.equal(0);
      expect(layout.middleColumn.length).to.equal(0);
      expect(layout.rightColumn.length).to.equal(0);
    });
  });

  describe('setting botLayout as a cookie', () => {
    beforeEach(() => {
      sinon.stub(document, 'getElementById');
    });

    afterEach(() => {
      document.getElementById.restore();
    });

    it('ok, empty layout', () => {
      uLayout.getLayoutAndSaveAsCookie();
      const layout = JSON.parse(uView.getCookie('blank-bots-layout'));
      expect(layout.leftColumn).to.not.equal(undefined);
      expect(layout.middleColumn).to.not.equal(undefined);
      expect(layout.rightColumn).to.not.equal(undefined);
      expect(layout.rightColumn).to.not.equal(undefined);
      expect(layout.notAColumn).to.equal(undefined);
    });

    it('ok, layout is not empty', () => {
      document.getElementById.withArgs('botsLeftColumn')
        .returns(leftColumn);
      document.getElementById.withArgs('botsMiddleColumn')
        .returns(middleColumn);
      document.getElementById.withArgs('botsRightColumn')
        .returns(rightColumn);
      uLayout.getLayoutAndSaveAsCookie();
      const layout = JSON.parse(uView.getCookie('blank-bots-layout'));
      expect(layout.leftColumn.length).to.equal(2);
    });
  });
});
