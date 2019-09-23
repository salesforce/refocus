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
const eventTypes = require('../../../view/perspective/eventsQueue.js').eventType;
const eventsQueue = app.exportForTesting.eventsQueue.queue;
const v1hierarchy = require('./v1hierarchy');
const v2hierarchy = require('./v2hierarchy');
const allAspects = require('./v2aspects');

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

    function mockAspectEventWithTimeouts(eventType, timeout) {
      if (Array.isArray(timeout)) {
        mockAspectEvent(eventType, { timeout: timeout[1] });
      } else {
        mockAspectEvent(eventType, { timeout });
      }
    }

    function getAspectsWithTimeouts(...timeoutArray) {
      return timeoutArray.map((timeout) => (
        { timeout }
      ));
    }

    it('setupAspectTimeout', () => {
      const aspects = getAspectsWithTimeouts('5s', '6s', '1m', '5s', '5s', '2m');
      app.setupAspectTimeout(aspects);
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(5000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(120000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(3);
    });

    it('handleEvent', () => {
      let intervalId1;
      let intervalId2;

      intervalId1 = app.getTimeoutValues().intervalId;
      mockAspectEventWithTimeouts('delete', '5s');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(5000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(120000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(2);
      expect(intervalId1).to.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockAspectEventWithTimeouts('add', '4s');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(4000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(120000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.not.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockAspectEventWithTimeouts('add', '3m');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(4000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockAspectEventWithTimeouts('delete', '4s');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.not.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockAspectEventWithTimeouts('add', '10s');
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(10000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.not.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockAspectEventWithTimeouts('update', ['10s', '6s']);
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(6000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(1);
      expect(intervalId1).to.not.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockAspectEventWithTimeouts('update', ['10s', '6s']);
      intervalId2 = app.getTimeoutValues().intervalId;
      expect(app.getTimeoutValues().minAspectTimeout).to.equal(6000);
      expect(app.getTimeoutValues().maxAspectTimeout).to.equal(180000);
      expect(app.getTimeoutValues().minTimeoutCount).to.equal(2);
      expect(intervalId1).to.equal(intervalId2);
      expect(intervalId2._repeat).to.equal(app.getTimeoutValues().minAspectTimeout);

      intervalId1 = app.getTimeoutValues().intervalId;
      mockAspectEventWithTimeouts('update', ['10s', '4m']);
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
          mockAspectEventWithTimeouts('update', ['30s', '60s']);
          const time2 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
          done();
        }, 10);
      });

      it('add', (done) => {
        setTimeout(() => {
          const time1 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.below(time1);
          mockAspectEventWithTimeouts('add', '30s');
          const time2 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
          done();
        }, 10);
      });

      it('delete', (done) => {
        setTimeout(() => {
          const time1 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.below(time1);
          mockAspectEventWithTimeouts('delete', '30s');
          const time2 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
          done();
        }, 10);
      });

      it('setup', (done) => {
        setTimeout(() => {
          const time1 = Date.now();
          expect(app.getTimeoutValues().lastUpdateTime).to.be.below(time1);
          app.setupAspectTimeout([]);
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

  describe('handleHierarchyEvent >', () => {

    const perspective = {
      aspectFilterType: 'INCLUDE',
      aspectFilter: ['Temp-High', 'Temp-Low'],
      statusFilterType: 'EXCLUDE',
      statusFilter: [],
      subjectTagFilterType: 'EXCLUDE',
      subjectTagFilter: [],
      aspectTagFilterType: 'INCLUDE',
      aspectTagFilter: ['High'],
    };

    describe('v1 lens', () => {
      it('with v1 hierarchy', () => {
        const hierarchyLoadEvent =
          app.exportForTesting.handleHierarchyEvent(
            v1hierarchy, allAspects, perspective, false
          );
        expect(hierarchyLoadEvent.detail).to.deep.equal(v1hierarchy);
      });

      it('with v2 hierarchy', () => {
        const hierarchyLoadEvent =
          app.exportForTesting.handleHierarchyEvent(
            v2hierarchy, allAspects, perspective, false
          );
        expect(hierarchyLoadEvent.detail).to.deep.equal(v1hierarchy);
      });
    });

    describe('v2 lens', () => {
      before(() => app.exportForTesting.setLensEventApiVersion(2));
      after(() => app.exportForTesting.setLensEventApiVersion(1));

      it('with v1 hierarchy', () => {
        const hierarchyLoadEvent =
          app.exportForTesting.handleHierarchyEvent(
            v1hierarchy, allAspects, perspective, false
          );
        expect(hierarchyLoadEvent.detail).to.have.keys('aspects', 'hierarchy');
        expect(hierarchyLoadEvent.detail.aspects.map(a => a.name))
          .to.deep.equal(['Temp-High']);
        expect(hierarchyLoadEvent.detail.hierarchy).to.deep.equal(v1hierarchy);
      });

      it('with v2 hierarchy', () => {
        const hierarchyLoadEvent =
          app.exportForTesting.handleHierarchyEvent(
            v2hierarchy, allAspects, perspective, false
          );
        expect(hierarchyLoadEvent.detail).to.have.keys('aspects', 'hierarchy');
        expect(hierarchyLoadEvent.detail.aspects.map(a => a.name))
          .to.deep.equal(['Temp-High']);
        expect(hierarchyLoadEvent.detail.hierarchy).to.deep.equal(v2hierarchy);
      });
    });
  });

  describe('event interception >', () => {
    const perspective = {
      aspectFilterType: 'INCLUDE',
      aspectFilter: ['Temp-High', 'Temp-Low'],
      statusFilterType: 'EXCLUDE',
      statusFilter: [],
      subjectTagFilterType: 'EXCLUDE',
      subjectTagFilter: [],
      aspectTagFilterType: 'INCLUDE',
      aspectTagFilter: ['High'],
    };

    const high = allAspects.find(a => a.name === 'Temp-High');
    const low = allAspects.find(a => a.name === 'Temp-Low');
    const avg = allAspects.find(a => a.name === 'Temp-Avg');
    const CanadaHigh = {
      name: 'NorthAmerica.Canada|Temp-High',
      status: 'OK',
    };
    const UnitedStatesHigh = {
      name: 'NorthAmerica.UnitedStates|Temp-High',
      status: 'OK',
    };
    const MexicoHigh = {
      name: 'NorthAmerica.Mexico|Temp-High',
      status: 'OK',
    };

    describe('v1 lens >', () => {
      before(() => app.exportForTesting.setLensEventApiVersion(1));
      after(() => app.exportForTesting.setLensEventApiVersion(1));
      afterEach(() => eventsQueue.splice(0));

      let newSample, newAspect;

      it('aspects are attached to sample events to match the v1 format', () => {
        app.exportForTesting.handleHierarchyEvent(
          v2hierarchy, allAspects, perspective, false
        );

        // sample add
        mockSampleEvent('add', CanadaHigh);
        expect(eventsQueue[0]).to.deep.equal({
          'sample.add': {
            name: 'NorthAmerica.Canada|Temp-High',
            status: 'OK',
            aspect: high,
          },
        });

        // sample delete
        mockSampleEvent('delete', UnitedStatesHigh);
        expect(eventsQueue[1]).to.deep.equal({
          'sample.remove': {
            name: 'NorthAmerica.UnitedStates|Temp-High',
            status: 'OK',
            aspect: high,
          },
        });

        // sample update
        newSample = JSON.parse(JSON.stringify(MexicoHigh));
        newSample.status = 'Info';
        mockSampleEvent('update', newSample);
        expect(eventsQueue[2]).to.deep.equal({
          'sample.update': {
            new: {
              name: 'NorthAmerica.Mexico|Temp-High',
              status: 'Info',
              aspect: high,
            },
          },
        });

        // update aspect
        newAspect = JSON.parse(JSON.stringify(high));
        newAspect.timeout = '10m';
        mockAspectEvent('update', newAspect);

        newSample = JSON.parse(JSON.stringify(CanadaHigh));
        newSample.status = 'Info';
        mockSampleEvent('update', newSample);
        expect(eventsQueue[3]).to.deep.equal({
          'sample.update': {
            new: {
              name: 'NorthAmerica.Canada|Temp-High',
              status: 'Info',
              aspect: newAspect,
            },
          },
        });

        // delete aspect
        mockAspectEvent('delete', high);
        mockSampleEvent('add', UnitedStatesHigh);
        expect(eventsQueue[4]).to.deep.equal({
          'sample.add': {
            name: 'NorthAmerica.UnitedStates|Temp-High',
            status: 'OK',
            aspect: undefined,
          },
        });

        // add aspect
        newAspect = JSON.parse(JSON.stringify(low));
        newAspect.tags.push('High');
        const UnitedStatesLow = {
          name: 'NorthAmerica.UnitedStates|Temp-Low',
          status: 'OK',
        };

        mockAspectEvent('add', newAspect);
        mockSampleEvent('add', UnitedStatesLow);
        expect(eventsQueue[5]).to.deep.equal({
          'sample.add': {
            name: 'NorthAmerica.UnitedStates|Temp-Low',
            status: 'OK',
            aspect: newAspect,
          },
        });
      });
    });

    describe('v2 lens >', () => {
      before(() => app.exportForTesting.setLensEventApiVersion(2));
      after(() => app.exportForTesting.setLensEventApiVersion(1));
      afterEach(() => eventsQueue.splice(0));

      let newSample, newAspect;

      it('sample events do not have aspects attached', () => {
        app.exportForTesting.handleHierarchyEvent(
          v2hierarchy, allAspects, perspective, false
        );

        // sample add
        mockSampleEvent('add', CanadaHigh);
        expect(eventsQueue[0]).to.deep.equal({
          'sample.add': {
            name: 'NorthAmerica.Canada|Temp-High',
            status: 'OK',
          },
        });

        // sample delete
        mockSampleEvent('delete', UnitedStatesHigh);
        expect(eventsQueue[1]).to.deep.equal({
          'sample.remove': {
            name: 'NorthAmerica.UnitedStates|Temp-High',
            status: 'OK',
          },
        });

        // sample update
        newSample = JSON.parse(JSON.stringify(MexicoHigh));
        newSample.status = 'Info';
        mockSampleEvent('update', newSample);
        expect(eventsQueue[2]).to.deep.equal({
          'sample.update': {
            new: {
              name: 'NorthAmerica.Mexico|Temp-High',
              status: 'Info',
            },
          },
        });

        // update aspect
        newAspect = JSON.parse(JSON.stringify(high));
        newAspect.timeout = '10m';
        mockAspectEvent('update', newAspect);

        newSample = JSON.parse(JSON.stringify(CanadaHigh));
        newSample.status = 'Info';
        mockSampleEvent('update', newSample);
        expect(eventsQueue[3]).to.deep.equal({
          'sample.update': {
            new: {
              name: 'NorthAmerica.Canada|Temp-High',
              status: 'Info',
            },
          },
        });

        // delete aspect
        mockAspectEvent('delete', high);
        mockSampleEvent('add', UnitedStatesHigh);
        expect(eventsQueue[4]).to.deep.equal({
          'sample.add': {
            name: 'NorthAmerica.UnitedStates|Temp-High',
            status: 'OK',
          },
        });

        // add aspect
        newAspect = JSON.parse(JSON.stringify(low));
        newAspect.tags.push('High');
        const UnitedStatesLow = {
          name: 'NorthAmerica.UnitedStates|Temp-Low',
          status: 'OK',
        };
        mockAspectEvent('add', newAspect);
        mockSampleEvent('add', UnitedStatesLow);
        expect(eventsQueue[5]).to.deep.equal({
          'sample.add': {
            name: 'NorthAmerica.UnitedStates|Temp-Low',
            status: 'OK',
          },
        });
      });
    });
  });
});

function mockAspectEvent(eventType, aspect) {
  const eventData = {};
  let eventTypeName;
  if (eventType === 'add') {
    eventTypeName = eventTypes.INTRNL_ASP_ADD;
  } else if (eventType === 'update') {
    eventTypeName = eventTypes.INTRNL_ASP_UPD;
  } else if (eventType === 'delete') {
    eventTypeName = eventTypes.INTRNL_ASP_DEL;
  }

  if (eventType === 'update') {
    eventData[eventTypeName] = { new: aspect };
  } else {
    eventData[eventTypeName] = aspect;
  }

  app.handleEvent(JSON.stringify(eventData), eventTypeName);
}

function mockSampleEvent(eventType, sample) {
  const eventData = {};
  let eventTypeName;
  if (eventType === 'add') {
    eventTypeName = eventTypes.INTRNL_SMPL_ADD;
  } else if (eventType === 'update') {
    eventTypeName = eventTypes.INTRNL_SMPL_UPD;
  } else if (eventType === 'delete') {
    eventTypeName = eventTypes.INTRNL_SMPL_DEL;
  }

  if (eventType === 'update') {
    eventData[eventTypeName] = { new: sample };
  } else {
    eventData[eventTypeName] = sample;
  }

  app.handleEvent(JSON.stringify(eventData), eventTypeName);
}
