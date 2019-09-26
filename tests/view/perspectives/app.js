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
    describe('setupAutoReload', () => {
      function getAspectsWithTimeouts(aspMap) {
        return Object.entries(aspMap).map(([aspName, timeout]) => ({
          name: aspName,
          timeout,
        }));
      }

      function getSamplesForAspects(subName, aspNames) {
        return aspNames.map((aspName) => ({
          name: `${subName}|${aspName}`,
        }));
      }

      function buildChildrenWithSamples(sampleMap) {
        return Object.entries(sampleMap).map(([subName, aspNames]) => ({
          absolutePath: `root.${subName}`,
          samples: getSamplesForAspects(`root.${subName}`, aspNames),
        }));
      }

      function expectInterval(expectedInterval) {
        const interval = app.getTimeoutValues().timeoutCheckInterval;
        if (expectedInterval) {
          expect(interval._repeat).to.equal(expectedInterval);
        } else {
          expect(interval).to.not.exist;
        }
      }

      let aspects, perspective, hierarchy;

      beforeEach(() => {
        aspects = getAspectsWithTimeouts({
          a1: '5s', a2: '6s', a3: '1m',
        });

        perspective = {
          aspectFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          aspectTagFilterType: 'EXCLUDE',
          statusFilterType: 'EXCLUDE',
        };

        hierarchy = {
          absolutePath: 'root',
          children: buildChildrenWithSamples({
            sub1: ['a1', 'a2', 'a3'],
            sub2: ['a1', 'a2', 'a3'],
          }),
        };
      });

      afterEach(() => app.exportForTesting.resetState());

      it('basic', () => {
        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(5000);
      });

      it('aspects spread across hierarchy', () => {
        hierarchy.children = buildChildrenWithSamples({
          sub1: ['a2', 'a3'],
          sub2: ['a3', 'a1'],
          sub3: ['a2'],
        });

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(5000);
      });

      it('aspects buried in hierarchy', () => {
        hierarchy.children = [
          {
            absolutePath: 'root.sub1',
            samples: getSamplesForAspects(`root.sub1`, ['a2']),
          },
          {
            absolutePath: 'root.sub2',
            children: [
              {
                absolutePath: 'root.sub2.sub3',
                children: [
                  {
                    absolutePath: 'root.sub2.sub3.sub5',
                    samples: getSamplesForAspects(`root.sub2.sub3.sub5`, ['a1']),
                  },
                ],
              },
              {
                absolutePath: 'root.sub2.sub4',
                samples: getSamplesForAspects(`root.sub2.sub4`, ['a3']),
              },
            ],
          },
        ];

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(5000);
      });

      it('aspects not in perspective filters', () => {
        perspective.aspectFilter = ['a1'];

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(6000);
      });

      it('aspects not in hierarchy', () => {
        hierarchy.children = buildChildrenWithSamples({
          sub1: ['a2'],
          sub2: ['a3'],
        });

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(6000);
      });

      it('case mismatch ok (1)', () => {
        hierarchy.children = buildChildrenWithSamples({
          sub1: ['A1', 'A2', 'A3'],
        });

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(5000);
      });

      it('case mismatch ok (2)', () => {
        aspects = getAspectsWithTimeouts({
          A1: '5s', A2: '6s', A3: '1m',
        });

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(5000);
      });

      it('no aspects', () => {
        aspects = [];

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(null);
      });

      it('no aspects that match perspective filters', () => {
        perspective.aspectFilterType = 'INCLUDE';
        perspective.aspectFilter = ['a4', 'a5'];

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(null);
      });

      it('no aspects that match hierarchy', () => {
        hierarchy.children = buildChildrenWithSamples({
          sub1: ['a4', 'a5'],
        });

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(null);
      });

      it('no children', () => {
        delete hierarchy.children;

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(null);
      });

      it('null children', () => {
        hierarchy.children = null;

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(null);
      });

      it('empty children', () => {
        hierarchy.children = [];

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(null);
      });

      it('no samples', () => {
        delete hierarchy.children[0].samples;
        delete hierarchy.children[1].samples;

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(null);
      });

      it('null samples', () => {
        hierarchy.children[0].samples = null;
        hierarchy.children[1].samples = null;

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(null);
      });

      it('empty samples', () => {
        hierarchy.children[0].samples = [];
        hierarchy.children[1].samples = [];

        app.exportForTesting.handleHierarchyEvent(hierarchy, aspects, perspective);
        expectInterval(null);
      });
    });

    describe('lastUpdateTime >', () => {
      it('setup', () => {
        const time1 = Date.now();
        app.setupAutoReload({});
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('sample update', () => {
        const time1 = Date.now();
        mockSampleEvent('update', { name: 'root.sub1|asp1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('sample add', () => {
        const time1 = Date.now();
        mockSampleEvent('update', { name: 'root.sub1|asp1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('sample delete', () => {
        const time1 = Date.now();
        mockSampleEvent('update', { name: 'root.sub1|asp1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('sample nochange', () => {
        const time1 = Date.now();
        mockSampleEvent('nochange', { name: 'root.sub1|asp1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('aspect update', () => {
        const time1 = Date.now();
        mockAspectEvent('update', { name: 'asp1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('aspect add', () => {
        const time1 = Date.now();
        mockAspectEvent('update', { name: 'asp1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('aspect delete', () => {
        const time1 = Date.now();
        mockAspectEvent('update', { name: 'asp1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('subject update', () => {
        const time1 = Date.now();
        mockSubjectEvent('update', { name: 'sub1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('subject add', () => {
        const time1 = Date.now();
        mockSubjectEvent('update', { name: 'sub1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
      });

      it('subject delete', () => {
        const time1 = Date.now();
        mockSubjectEvent('update', { name: 'sub1' });
        const time2 = Date.now();
        expect(app.getTimeoutValues().lastUpdateTime).to.be.within(time1, time2);
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
      beforeEach(() => eventsQueue.splice(0));
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
  } else if (eventType === 'nochange') {
    eventTypeName = eventTypes.INTRNL_SMPL_NC;
  }

  if (eventType === 'update') {
    eventData[eventTypeName] = { new: sample };
  } else {
    eventData[eventTypeName] = sample;
  }

  app.handleEvent(JSON.stringify(eventData), eventTypeName);
}

function mockSubjectEvent(eventType, subject) {
  const eventData = {};
  let eventTypeName;
  if (eventType === 'add') {
    eventTypeName = eventTypes.INTRNL_SUBJ_ADD;
  } else if (eventType === 'update') {
    eventTypeName = eventTypes.INTRNL_SUBJ_UPD;
  } else if (eventType === 'delete') {
    eventTypeName = eventTypes.INTRNL_SUBJ_DEL;
  }

  if (eventType === 'update') {
    eventData[eventTypeName] = { new: subject };
  } else {
    eventData[eventTypeName] = subject;
  }

  app.handleEvent(JSON.stringify(eventData), eventTypeName);
}
