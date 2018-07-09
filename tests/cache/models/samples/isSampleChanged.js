/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/isSampleChanged.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const isSampleChanged =
  require('../../../../cache/models/samples').isSampleChanged;

/*
 * Note that by the time this fn gets called, we have already added subjectId
 * and aspectId to the sample, even though they weren't part of the sample from
 * the actual request.
 */
const fromRequest = {
  name: 'california.sanfrancisco|temperature',
  value: '48',
  subjectId: '12125ea9-5716-477e-8ce3-037b4d15ca6e',
  aspectId: '04f875b7-1b51-4820-8b25-6bf238b6597c',
};

const fromRedis = {
  name: 'california.sanfrancisco|temperature',
  user: '{"name":"jane@doe.com","email":"jane@doe.com","profile":{"name":"RefocusUser"}}',
  statusChangedAt: '2018-06-25T22:41:52.683Z',
  updatedAt: '2018-06-26T17:41:14.981Z',
  createdAt: '2018-06-25T22:41:52.683Z',
  previousStatus: 'Invalid',
  aspectId: '04f875b7-1b51-4820-8b25-6bf238b6597c',
  provider: '16c45218-5aa1-4454-b7d2-da9145277dfd',
  subjectId: '12125ea9-5716-477e-8ce3-037b4d15ca6e',
  value: '48',
  relatedLinks: '[]',
  status: 'Invalid',
};

describe('tests/cache/models/samples/isSampleChanged.js >', () => {
  it('no changes', () => {
    expect(isSampleChanged(fromRequest, fromRedis)).to.be.false;
  });

  it('value changes', () => {
    const fromReq = JSON.parse(JSON.stringify(fromRequest));
    fromReq.value = '11';
    expect(isSampleChanged(fromReq, fromRedis)).to.be.true;
  });

  it('messageBody added', () => {
    const fromReq = JSON.parse(JSON.stringify(fromRequest));
    fromReq.messageBody = 'Wow I cannot believe this!';
    expect(isSampleChanged(fromReq, fromRedis)).to.be.true;
  });

  it('ignore case change to name attr', () => {
    const fromReq = JSON.parse(JSON.stringify(fromRequest));
    fromReq.name = fromReq.name.toUpperCase();
    expect(isSampleChanged(fromReq, fromRedis)).to.be.false;
  });
});
