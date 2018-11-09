/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/helpers/common.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../testUtils');
const u = require('../model/subject/utils');
const Subject = tu.db.Subject;
const common = require('../../../db/helpers/common');

describe('tests/db/helpers/common.js >', () => {
  after(u.forceDelete);

  describe('checkDuplicatesInStringArray >', () => {
    it('empty input returns false', () => {
      expect(common.checkDuplicatesInStringArray()).to.be.false;
    });

    it('empty array input returns false', () => {
      expect(common.checkDuplicatesInStringArray([])).to.be.false;
    });

    it('all identical elements returns true', () => {
      expect(common.checkDuplicatesInStringArray(['a', 'a', 'a'])).to.be.true;
    });

    it('no duplicates return false', () => {
      expect(common.checkDuplicatesInStringArray(['a', 'b', 'c'])).to.be.false;
    });

    it('multiple duplicates return true', () => {
      const uniqueArray = ['a', 'b', 'c'];
      const dupesArr = [];
      dupesArr.push(...uniqueArray);
      dupesArr.push(...uniqueArray);
      dupesArr.push(...uniqueArray);
      expect(dupesArr.length).to.equal(9);
      expect(common.checkDuplicatesInStringArray(dupesArr)).to.be.true;
    });
  });

  describe('tagsChanged', () => {
    let sub;

    beforeEach(() => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}1`, null);
      s.tags = ['tag1', 'tag2'];
      return Subject.create(s)
      .then((s) => sub = s);
    });

    afterEach(u.forceDelete);

    it('not updated', () => {
      sub.set({ description: '...' });
      expect(common.tagsChanged(sub)).to.be.false;
    });

    it('exactly the same', () => {
      sub.set({ tags: ['tag1', 'tag2'] });
      expect(common.tagsChanged(sub)).to.be.false;
    });

    it('different order', () => {
      sub.set({ tags: ['tag2', 'tag1'] });
      expect(common.tagsChanged(sub)).to.be.false;
    });

    it('different capitalization', () => {
      sub.set({ tags: ['Tag1', 'Tag2'] });
      expect(common.tagsChanged(sub)).to.be.false;
    });

    it('changed', () => {
      sub.set({ tags: ['tag1', 'tag3'] });
      expect(common.tagsChanged(sub)).to.be.true;
    });

    it('appended', () => {
      sub.set({ tags: ['tag1', 'tag2', 'tag3'] });
      expect(common.tagsChanged(sub)).to.be.true;
    });

    it('set to empty', () => {
      sub.set({ tags: [] });
      expect(common.tagsChanged(sub)).to.be.true;
    });

    it('no previous tags', () => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}2`, null);
      return Subject.create(s)
      .then((sub) => {
        sub.set({ tags: ['tag1', 'tag2'] });
        expect(common.tagsChanged(sub)).to.be.true;
      });
    });

    it('no previous tags, not updated', () => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}2`, null);
      return Subject.create(s)
      .then((sub) => {
        sub.set({ description: '...' });
        expect(common.tagsChanged(sub)).to.be.false;
      });
    });
  });

  describe('Validate settings object', () => {
    it('Ok, empty object is valid', () => {
      expect(() => common.validateSettings({})).to.not.throw();
    });

    it('Ok, sharedContext and initialBotData are both valid', () => {
      const settings = {
        sharedContext: {
          meanBot: {
            niceBot: {
              niceBotData: {
                occupation: '${meanBot.meanBotData.occupation}',
              },
            },
          },
          initialBotData: {
            meanBot: {
              meanBotData: '{"occupation":"farmer"}',
            },
            niceBot: {
              niceBotData: '',
            },
          },
        },
      };

      expect(() => common.validateSettings({})).to.not.throw();
    });

    it('Fail, sharedContext field should be an Object', () => {
      expect(() => common.validateSettings({ sharedContext: 'STRING' }))
        .to.throw('ValidationError');
    });

    it('Fail, initialBotData field should be an object', () => {
      expect(() => common.validateSettings({ initialBotData: 123 }))
        .to.throw('ValidationError');
    });
  });
});
