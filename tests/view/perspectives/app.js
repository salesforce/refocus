/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/perspectives/app.js
 */
'use strict';
const chai = require('chai');
const expect = chai.expect;
import { getFilterQuery,
  getTagsFromArrays } from '../../../view/perspective/utils.js';
const app = require('../../../view/perspective/app.js');
const eventsQueue = require('../../../view/perspective/eventsQueue.js');

describe('tests/view/perspectives/app.js >', () => {
  describe('get filter query >', () => {
    it('given default exclude and no filter, should return ' +
      'empty string', () => {
      const perspectiveObject = {
        aspectFilter: [],
        aspectFilterType: 'EXCLUDE',
        statusFilter: [],
        statusFilterType: 'EXCLUDE',
        subjectTagFilterType: 'EXCLUDE',
        subjectTagFilter: [],
        aspectTagFilterType: 'EXCLUDE',
        aspectTagFilter: [],
      };

      const url = getFilterQuery(perspectiveObject);
      expect(url).to.equal('');
    });

    describe('mix INCLUDE with EXCLUDE >', () => {
      it('one of each', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1'],
          aspectFilterType: 'INCLUDE',
          statusFilter: ['Critical'],
          statusFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          subjectTagFilter: [],
          aspectTagFilterType: 'EXCLUDE',
          aspectTagFilter: [],
        };

        const url = getFilterQuery(perspectiveObject);
        expect(url).to.equal('?aspect=aspect1&status=-Critical');
      });

      it('two of each', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1', 'aspect2'],
          aspectFilterType: 'INCLUDE',
          statusFilter: ['Critical', 'OK'],
          statusFilterType: 'INCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          subjectTagFilter: ['subjectTag1', 'subjectTag2'],
          aspectTagFilterType: 'EXCLUDE',
          aspectTagFilter: ['aspectTag1', 'aspectTag2'],
        };

        const url = '?aspect=aspect1,aspect2&aspectTags=-' +
          'aspectTag1,-aspectTag2&subjectTags=-subjectTag1,-subjectTag2&status=Critical,OK';
        expect(getFilterQuery(perspectiveObject)).to.equal(url);
      });
    });

    describe('all EXCLUDE >', () => {
      it('one filter', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1', 'aspect2'],
          aspectFilterType: 'EXCLUDE',
          statusFilter: [],
          statusFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          subjectTagFilter: [],
          aspectTagFilterType: 'EXCLUDE',
          aspectTagFilter: [],
        };

        const url = getFilterQuery(perspectiveObject);
        expect(url).to.equal('?aspect=-aspect1,-aspect2');
      });

      it('two filters', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1'],
          aspectFilterType: 'EXCLUDE',
          statusFilter: [],
          statusFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          subjectTagFilter: [],
          aspectTagFilterType: 'EXCLUDE',
          aspectTagFilter: ['aspectTag1'],
        };

        const url = getFilterQuery(perspectiveObject);
        expect(url).to.equal('?aspect=-aspect1&aspectTags=-aspectTag1');
      });

      it('three filters', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1'],
          aspectFilterType: 'EXCLUDE',
          statusFilter: [],
          statusFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          subjectTagFilter: ['subjectTag1'],
          aspectTagFilterType: 'EXCLUDE',
          aspectTagFilter: ['aspectTag1'],
        };

        const url = '?aspect=-aspect1&aspectTags' +
          '=-aspectTag1&subjectTags=-subjectTag1';
        expect(getFilterQuery(perspectiveObject)).to.equal(url);
      });

      it('all filters', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1', 'aspect2'],
          aspectFilterType: 'EXCLUDE',
          statusFilter: ['Critical,OK'],
          statusFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          subjectTagFilter: ['subjectTag1', 'subjectTag2'],
          aspectTagFilterType: 'EXCLUDE',
          aspectTagFilter: ['aspectTag1', 'aspectTag2'],
        };

        const url = '?aspect=-aspect1,-aspect2&aspectTags=-aspectTag1,-aspectTag2' +
          '&subjectTags=-subjectTag1,-subjectTag2&status=-Critical,-OK';
        expect(getFilterQuery(perspectiveObject))
          .to.equal(url);
      });
    });

    describe('all INCLUDE >', () => {
      it('with one filter', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1'],
          aspectFilterType: 'INCLUDE',
          statusFilter: [],
          statusFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          subjectTagFilter: [],
          aspectTagFilterType: 'EXCLUDE',
          aspectTagFilter: [],
        };

        const url = getFilterQuery(perspectiveObject);
        expect(url).to.equal('?aspect=aspect1');
      });

      it('with two filters', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1'],
          aspectFilterType: 'INCLUDE',
          statusFilter: [],
          statusFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          subjectTagFilter: [],
          aspectTagFilterType: 'INCLUDE',
          aspectTagFilter: ['aspectTag1', 'aspectTag2'],
        };

        const url = getFilterQuery(perspectiveObject);
        expect(url).to.equal('?aspect=aspect1&aspectTags=aspectTag1,aspectTag2');
      });

      it('with three filters', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1'],
          aspectFilterType: 'INCLUDE',
          statusFilter: [],
          statusFilterType: 'EXCLUDE',
          subjectTagFilterType: 'INCLUDE',
          subjectTagFilter: ['subjectTag1', 'subjectTag2'],
          aspectTagFilterType: 'INCLUDE',
          aspectTagFilter: ['aspectTag1'],
        };

        const url = '?aspect=aspect1&aspectTags=aspectTag1' +
          '&subjectTags=subjectTag1,subjectTag2';
        expect(getFilterQuery(perspectiveObject)).to.equal(url);
      });

      it('all filters', () => {
        const perspectiveObject = {
          aspectFilter: ['aspect1'],
          aspectFilterType: 'INCLUDE',
          statusFilter: ['Critical'],
          statusFilterType: 'INCLUDE',
          subjectTagFilterType: 'INCLUDE',
          subjectTagFilter: ['subjectTag1'],
          aspectTagFilterType: 'INCLUDE',
          aspectTagFilter: ['aspectTag1'],
        };

        const url = '?aspect=aspect1&aspectTags=aspectTag1' +
          '&subjectTags=subjectTag1&status=Critical';
        expect(getFilterQuery(perspectiveObject)).to.equal(url);
      });
    });
  });

  describe('get array >', () => {
    it('by default, returns nothing', () => {
      const array = [{ absolutePath: 'COOLCOOLCOOL' },
      { absolutePath: 'COOLCOOLCOOL' }];
      const result = getTagsFromArrays(array);
      expect(result).to.be.empty;
    });

    it('returns unique elements', () => {
      const tagsArr = ['a', 'b'];
      const array = [{ absolutePath: 'COOLCOOLCOOL', tags: tagsArr },
      { absolutePath: 'COOLCOOLCOOL', tags: tagsArr }];
      const result = getTagsFromArrays(array);
      expect(result).to.deep.equal(['a', 'b']);
    });

    it('returns all elements', () => {
      const tagsArr = ['a', 'b', 'c', 'd'];
      const array = [{ absolutePath: 'COOLCOOLCOOL', tags: tagsArr.slice(0, 2) },
      { absolutePath: 'COOLCOOLCOOL', tags: tagsArr.slice(2) }];
      const result = getTagsFromArrays(array);
      expect(result).to.deep.equal(tagsArr);
    });
  });

  describe('timeout check >', () => {

    const subjectObj = {
      samples: [],
      children: []
    };
    const sampleObj = {
      aspect: {
        timeout: '10s'
      }
    };

    function getSampleWithTimeout(timeout) {
      const sample = JSON.parse(JSON.stringify(sampleObj));
      sample.aspect.timeout = timeout;
      return sample;
    }

    function getSubjectWithTimeouts(...timeoutArray) {
      const subject = JSON.parse(JSON.stringify(subjectObj));
      timeoutArray.forEach((timeout) => {
        subject.samples.push(getSampleWithTimeout(timeout));
      });
      return subject;
    }

    function mockEvent(eventType, timeout) {
      const eventData = {};
      let eventTypeName;
      if (eventType === 'add') {
        eventTypeName = eventsQueue.eventType.INTRNL_SMPL_ADD;
      } else if (eventType === 'update') {
        eventTypeName = eventsQueue.eventType.INTRNL_SMPL_UPD;
      } else if (eventType === 'delete') {
        eventTypeName = eventsQueue.eventType.INTRNL_SMPL_DEL;
      }

      if (eventType === 'update') {
        const newSample = JSON.parse(JSON.stringify(sampleObj));
        const oldSample = JSON.parse(JSON.stringify(sampleObj));
        oldSample.aspect.timeout = timeout[0];
        newSample.aspect.timeout = timeout[1];
        eventData[eventTypeName] = {};
        eventData[eventTypeName].new = newSample;
        eventData[eventTypeName].old = oldSample;
      } else {
        const sample = JSON.parse(JSON.stringify(sampleObj));
        sample.aspect.timeout = timeout;
        eventData[eventTypeName] = sample;
      }

      app.handleEvent(JSON.stringify(eventData), eventTypeName);
    }


    it('setupAspectTimeout', () => {
      const rootSubject = JSON.parse(JSON.stringify(subjectObj));
      rootSubject.children.push(getSubjectWithTimeouts('5s', '6s'));
      rootSubject.children.push(getSubjectWithTimeouts('1m'));
      rootSubject.children[0].children.push(getSubjectWithTimeouts('5s', '5s'));
      rootSubject.children[1].children.push(getSubjectWithTimeouts('2m'));

      app.setupAspectTimeout(rootSubject);
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(5000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(120000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(3);
    });

    it('handleEvent', () => {
      let intervalId1;
      let intervalId2;

      intervalId1 = app.getTimeoutValues().intervalId;
      mockEvent('delete', '5s');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(5000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(120000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(2);
      expect(intervalId1).to.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockEvent('add', '4s');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(4000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(120000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.not.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockEvent('add', '3m');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(4000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockEvent('delete', '4s');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.not.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockEvent('add', '10s');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(10000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.not.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockEvent('update', ['10s', '6s']);
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(6000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.not.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockEvent('update', ['10s', '6s']);
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(6000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(2);
      expect(intervalId1).to.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockEvent('update', ['10s', '4m']);
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(6000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(240000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(2);
      expect(intervalId1).to.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

    });

    describe('lastUpdateTime >', () => {
      it('update', (done) => {
        setTimeout(() => {
          const time1 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.below(time1);
          mockEvent('update', ['30s', '60s']);
          const time2 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
          done();
        }, 10);
      });

      it('add', (done) => {
        setTimeout(() => {
          const time1 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.below(time1);
          mockEvent('add', '30s');
          const time2 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
          done();
        }, 10);
      });

      it('delete', (done) => {
        setTimeout(() => {
          const time1 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.below(time1);
          mockEvent('delete', '30s');
          const time2 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
          done();
        }, 10);
      });

      it('setup', (done) => {
        setTimeout(() => {
          const time1 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.below(time1);
          app.setupAspectTimeout({});
          const time2 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
          done();
        }, 10);
      });
    });

    it('parseTimeout', () => {
      expect(app.parseTimeout('5s')).to.equal(5000);
      expect(app.parseTimeout('3m')).to.equal(3 * 60 * 1000);
      expect(app.parseTimeout('4h')).to.equal(4 * 3600 * 1000);
      expect(app.parseTimeout('2d')).to.equal(2 * 86400 * 1000);
      expect(app.parseTimeout('5S')).to.equal(5000);
      expect(app.parseTimeout('3M')).to.equal(3 * 60 * 1000);
      expect(app.parseTimeout('4H')).to.equal(4 * 3600 * 1000);
      expect(app.parseTimeout('2D')).to.equal(2 * 86400 * 1000);
    });

  });
});
