/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/cleanAdd.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const model = require('../../../../cache/models/samples');

describe('tests/cache/models/samples/cleanAdd.js >', () => {
  describe('cleanAddAspectToSample >', () => {
    const sam = { id: 'ed9cbef2-48be-4fd2-8a3b-7107fa8d3534',
      messageCode: '25',
      name: '___Subject1.___Subject2|___Aspect1',
      status: 'Critical',
      previousStatus: 'Invalid',
      statusChangedAt: '2018-07-05T17:41:15.260Z',
      value: '0',
      relatedLinks: '[{"name":"Salesforce","value":"http://www.salesforce.com"}]',
      createdAt: '2018-07-05T17:41:15.260Z',
      updatedAt: '2018-07-05T17:41:15.260Z',
      aspectId: '966a9d60-4681-48de-9202-1497a230831c',
      subjectId: '0369e923-2783-4359-889f-fb96ad1f2d72',
    };
    const asp = {
      isPublished: 'true',
      createdAt: '2018-07-05T17:41:15.225Z',
      criticalRange: [0, 1],
      writers: [],
      name: '___Aspect1',
      timeout: '30s',
      tags: [],
      id: '966a9d60-4681-48de-9202-1497a230831c',
      updatedAt: '2018-07-05T17:41:15.225Z',
      isDeleted: '0',
      valueType: 'NUMERIC',
      relatedLinks: [
        { name: 'Google', value: 'http://www.google.com' },
        { name: 'Yahoo', value: 'http://www.yahoo.com' },
      ],
    };
    const res = {
      id: 'ed9cbef2-48be-4fd2-8a3b-7107fa8d3534',
      messageCode: '25',
      name: '___Subject1.___Subject2|___Aspect1',
      status: 'Critical',
      previousStatus: 'Invalid',
      statusChangedAt: '2018-07-05T17:41:15.260Z',
      value: '0',
      relatedLinks: [
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ],
      createdAt: '2018-07-05T17:41:15.260Z',
      updatedAt: '2018-07-05T17:41:15.260Z',
      aspectId: '966a9d60-4681-48de-9202-1497a230831c',
      subjectId: '0369e923-2783-4359-889f-fb96ad1f2d72',
      aspect: {
        isPublished: true,
        criticalRange: [0, 1],
        name: '___Aspect1',
        timeout: '30s',
        tags: [],
        id: '966a9d60-4681-48de-9202-1497a230831c',
        valueType: 'NUMERIC',
        relatedLinks: [
          { name: 'Google', value: 'http://www.google.com' },
          { name: 'Yahoo', value: 'http://www.yahoo.com' },
        ],
        rank: undefined,
      },
    };

    it('cleanAddAspectToSample', () => {
      expect(model.cleanAddAspectToSample(sam, asp)).to.deep.equal(res);
    });
  });

  describe('cleanAddSubjectToSample >', () => {
    const sam = {
      createdAt: '2018-07-05T17:41:20.762Z',
      subjectId: '216b424a-7444-43c7-9384-20d4b6e8380e',
      provider: 'caad8b74-c4a4-4952-8ba8-33a61aab36bd',
      value: '2',
      status: 'Warning',
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      previousStatus: 'Invalid',
      updatedAt: '2018-07-05T17:41:20.762Z',
      aspectId: '81eec977-bfca-47fd-b6af-baa2fd363cde',
      statusChangedAt: '2018-07-05T17:41:20.762Z',
      user: {
        name: '___testUser@refocus.com',
        email: '___testUser@refocus.com',
        profile: { name: '___testProfile' },
      },
      relatedLinks: [],
      aspect: {
        description: 'this is a0 description',
        id: '81eec977-bfca-47fd-b6af-baa2fd363cde',
        isPublished: true,
        name: '___TEST_ASPECT',
        criticalRange: [0, 1],
        warningRange: [2, 3],
        infoRange: [4, 5],
        okRange: [6, 7],
        timeout: '30s',
        valueType: 'BOOLEAN',
        relatedLinks: [],
        tags: [],
        rank: undefined,
      },
    };
    const sub = {
      absolutePath: '___TEST_SUBJECT',
      childCount: '0',
      description: 'this is sample description',
      id: '216b424a-7444-43c7-9384-20d4b6e8380e',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isDeleted: '0',
      isPublished: 'true',
      name: '___TEST_SUBJECT',
      relatedLinks: '[]',
      tags: '[]',
      sortBy: '',
      createdAt: 'Thu Jul 05 2018 10:41:20 GMT-0700 (PDT)',
      updatedAt: 'Thu Jul 05 2018 10:41:20 GMT-0700 (PDT)',
      hierarchyLevel: '1',
    };
    const res = {
      createdAt: '2018-07-05T17:41:20.762Z',
      subjectId: '216b424a-7444-43c7-9384-20d4b6e8380e',
      provider: 'caad8b74-c4a4-4952-8ba8-33a61aab36bd',
      value: '2',
      status: 'Warning',
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      previousStatus: 'Invalid',
      updatedAt: '2018-07-05T17:41:20.762Z',
      aspectId: '81eec977-bfca-47fd-b6af-baa2fd363cde',
      statusChangedAt: '2018-07-05T17:41:20.762Z',
      user: {
        name: '___testUser@refocus.com',
        email: '___testUser@refocus.com',
        profile: { name: '___testProfile' },
      },
      relatedLinks: [],
      aspect: {
        description: 'this is a0 description',
        id: '81eec977-bfca-47fd-b6af-baa2fd363cde',
        isPublished: true,
        name: '___TEST_ASPECT',
        criticalRange: [0, 1],
        warningRange: [2, 3],
        infoRange: [4, 5],
        okRange: [6, 7],
        timeout: '30s',
        valueType: 'BOOLEAN',
        relatedLinks: [],
        tags: [],
        rank: undefined,
      },
      subject: {
        absolutePath: '___TEST_SUBJECT',
        description: 'this is sample description',
        id: '216b424a-7444-43c7-9384-20d4b6e8380e',
        isPublished: true,
        name: '___TEST_SUBJECT',
        relatedLinks: [],
        tags: [],
        sortBy: '',
        createdAt: 'Thu Jul 05 2018 10:41:20 GMT-0700 (PDT)',
        updatedAt: 'Thu Jul 05 2018 10:41:20 GMT-0700 (PDT)',
        hierarchyLevel: 1,
        childCount: 0,
      },
    };

    it('cleanAddSubjectToSample', () => {
      expect(model.cleanAddSubjectToSample(sam, sub)).to.deep.equal(res);
    });
  });
});
