/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/updateSampleAttributes.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const sinon = require('sinon');
const model = require('../../../../cache/models/samples');
const updateSampleAttributes = model.updateSampleAttributes;
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const Op = require('sequelize').Op;

describe('tests/cache/models/samples/updateSampleAttributes.js >', () => {
  let clock;
  let time;

  before(() => {
    time = new Date('2018-10-30T20:24:37.053Z').getTime();
    clock = sinon.useFakeTimers(time);
  });

  after(() => clock.restore());
  afterEach(rtu.forceDelete);
  afterEach(() => tu.db.Aspect.destroy({
    where: {
      name: {
        [Op.iLike]: '___%',
      },
    },
    force: true,
  }));

  it('no sampObj', (done) => {
    let aspObj;
    const qb = {
      name: '___Subject|___ThreeHours',
      value: 2,
      subjectId: '323ef102-3b64-458d-b134-29d2cd840bb2',
    };
    const samp = null;

    tu.db.Aspect.create({
      isPublished: true,
      name: '___ThreeHours',
      timeout: '3H',
      valueType: 'NUMERIC',
      criticalRange: [0, 0],
      warningRange: [1, 1],
      infoRange: [2, 2],
      okRange: [3, 3],
    })
      .then((asp) => {
        aspObj = asp;
        qb.aspectId = asp.id;
        return updateSampleAttributes(qb, samp, 'Invalid');
      })
      .then(() => {
        expect(qb).to.deep.equal({
          name: '___Subject|___ThreeHours',
          value: 2,
          subjectId: '323ef102-3b64-458d-b134-29d2cd840bb2',
          aspectId: aspObj.id,
          previousStatus: 'Invalid',
          statusChangedAt: '2018-10-30T20:24:37.053Z',
          status: 'Invalid',
          relatedLinks: '[]',
          createdAt: '2018-10-30T20:24:37.053Z',
          updatedAt: '2018-10-30T20:24:37.053Z',
        });

        done();
      })
      .catch(done);
  });

  it('has value, new status', (done) => {
    let aspObj;
    const qb = {
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      value: '100',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
    };

    const samp = {
      status: 'Critical',
      value: '1',
      previousStatus: 'Invalid',
      user: '{"name":"___testUser@refocus.com",' +
        '"email":"___testUser@refocus.com",' +
        '"profile":{"name":"___testProfile"}}',
      createdAt: '2018-10-29T22:42:30.938Z',
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
      aspectId: '50513365-f24f-455c-8d47-c507d1c62a96',
      relatedLinks: '[]',
      statusChangedAt: '2018-10-29T22:42:30.938Z',
      provider: '84f3560b-1b68-4868-bea3-8dd0ad8aa8f3',
      updatedAt: '2018-10-29T22:42:30.938Z',
    };

    tu.db.Aspect.create({
      description: 'this is a0 description',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: true,
      name: '___TEST_ASPECT',
      timeout: '30s',
      valueLabel: 's',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
      warningRange: [2, 3],
      infoRange: [4, 5],
      okRange: [6, 7],
    })
      .then((asp) => {
        aspObj = asp;
        qb.aspectId = asp.id;
        return updateSampleAttributes(qb, samp, 'Invalid');
      })
      .then(() => {
        expect(qb).to.deep.equal({
          name: '___TEST_SUBJECT|___TEST_ASPECT',
          value: '100',
          subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
          aspectId: aspObj.id,
          previousStatus: 'Critical',
          statusChangedAt: '2018-10-30T20:24:37.053Z',
          status: 'Invalid',
          updatedAt: '2018-10-30T20:24:37.053Z',
        });

        done();
      })
      .catch(done);
  });

  it('no value, carries previous value forward', (done) => {
    let aspObj;
    const qb = {
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
    };
    const samp = {
      status: 'Critical',
      value: '1',
      previousStatus: 'Invalid',
      user: '{"name":"___testUser@refocus.com",' +
        '"email":"___testUser@refocus.com",' +
        '"profile":{"name":"___testProfile"}}',
      createdAt: '2018-10-29T22:42:30.938Z',
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
      aspectId: '50513365-f24f-455c-8d47-c507d1c62a96',
      relatedLinks: '[]',
      statusChangedAt: '2018-10-29T22:42:30.938Z',
      provider: '84f3560b-1b68-4868-bea3-8dd0ad8aa8f3',
      updatedAt: '2018-10-29T22:42:30.938Z',
    };

    tu.db.Aspect.create({
      description: 'this is a0 description',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: 'true',
      name: '___TEST_ASPECT',
      timeout: '30s',
      valueLabel: 's',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
      warningRange: [2, 3],
      infoRange: [4, 5],
      okRange: [6, 7],
    })
      .then((asp) => {
        aspObj = asp;
        qb.aspectId = asp.id;
        return updateSampleAttributes(qb, samp, 'Critical');
      })
      .then(() => {
        expect(qb).to.deep.equal({
          name: '___TEST_SUBJECT|___TEST_ASPECT',
          value: '1',
          subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
          aspectId: aspObj.id,
          previousStatus: 'Invalid',
          statusChangedAt: '2018-10-29T22:42:30.938Z',
          status: 'Critical',
          updatedAt: '2018-10-30T20:24:37.053Z',
        });

        done();
      })
      .catch(done);
  });

  it('value is undefined', (done) => {
    let aspObj;
    const qb = {
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      value: undefined,
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
    };
    const samp = {
      status: 'Critical',
      value: '1',
      previousStatus: 'Invalid',
      user: '{"name":"___testUser@refocus.com",' +
        '"email":"___testUser@refocus.com",' +
        '"profile":{"name":"___testProfile"}}',
      createdAt: '2018-10-29T22:42:30.938Z',
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
      aspectId: '50513365-f24f-455c-8d47-c507d1c62a96',
      relatedLinks: '[]',
      statusChangedAt: '2018-10-29T22:42:30.938Z',
      provider: '84f3560b-1b68-4868-bea3-8dd0ad8aa8f3',
      updatedAt: '2018-10-29T22:42:30.938Z',
    };

    tu.db.Aspect.create({
      description: 'this is a0 description',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: 'true',
      name: '___TEST_ASPECT',
      timeout: '30s',
      valueLabel: 's',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
      warningRange: [2, 3],
      infoRange: [4, 5],
      okRange: [6, 7],
    }).then((asp) => {
      aspObj = asp;
      qb.aspectId = asp.id;
      return updateSampleAttributes(qb, samp, 'Invalid');
    })
      .then(() => {
        expect(qb).to.deep.equal({
          name: '___TEST_SUBJECT|___TEST_ASPECT',
          value: '',
          subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
          aspectId: aspObj.id,
          previousStatus: 'Critical',
          statusChangedAt: '2018-10-30T20:24:37.053Z',
          status: 'Invalid',
          updatedAt: '2018-10-30T20:24:37.053Z',
        });

        done();
      })
      .catch(done);
  });

  it('has value, same status', (done) => {
    let aspObj;
    const qb = {
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      value: '0',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
    };
    const samp = {
      status: 'Critical',
      value: '1',
      previousStatus: 'Invalid',
      user: '{"name":"___testUser@refocus.com",' +
        '"email":"___testUser@refocus.com",' +
        '"profile":{"name":"___testProfile"}}',
      createdAt: '2018-10-29T22:42:30.938Z',
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
      aspectId: '50513365-f24f-455c-8d47-c507d1c62a96',
      relatedLinks: '[]',
      statusChangedAt: '2018-10-29T22:42:30.938Z',
      provider: '84f3560b-1b68-4868-bea3-8dd0ad8aa8f3',
      updatedAt: '2018-10-29T22:42:30.938Z',
    };

    tu.db.Aspect.create({
      description: 'this is a0 description',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: 'true',
      name: '___TEST_ASPECT',
      timeout: '30s',
      valueLabel: 's',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
      warningRange: [2, 3],
      infoRange: [4, 5],
      okRange: [6, 7],
    })
      .then((asp) => {
        aspObj = asp;
        qb.aspectId = asp.id;
        return updateSampleAttributes(qb, samp, 'Critical');
      })
      .then(() => {
        expect(qb).to.deep.equal({
          name: '___TEST_SUBJECT|___TEST_ASPECT',
          value: '0',
          subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
          aspectId: aspObj.id,
          previousStatus: 'Invalid',
          statusChangedAt: '2018-10-29T22:42:30.938Z',
          status: 'Critical',
          updatedAt: '2018-10-30T20:24:37.053Z',
        });

        done();
      })
      .catch(done);
  });

  it('adds related links', (done) => {
    let aspObj;
    const qb = {
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      value: '0',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
      relatedLinks: [{ name: 'a', url: 'bcd' }],
    };
    const samp = {
      status: 'Critical',
      value: '1',
      previousStatus: 'Invalid',
      user: '{"name":"___testUser@refocus.com",' +
        '"email":"___testUser@refocus.com",' +
        '"profile":{"name":"___testProfile"}}',
      createdAt: '2018-10-29T22:42:30.938Z',
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
      aspectId: '50513365-f24f-455c-8d47-c507d1c62a96',
      relatedLinks: '[]',
      statusChangedAt: '2018-10-29T22:42:30.938Z',
      provider: '84f3560b-1b68-4868-bea3-8dd0ad8aa8f3',
      updatedAt: '2018-10-29T22:42:30.938Z',
    };

    tu.db.Aspect.create({
      description: 'this is a0 description',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: 'true',
      name: '___TEST_ASPECT',
      timeout: '30s',
      valueLabel: 's',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
      warningRange: [2, 3],
      infoRange: [4, 5],
      okRange: [6, 7],
    })
      .then((asp) => {
        aspObj = asp;
        qb.aspectId = asp.id;
        return updateSampleAttributes(qb, samp, 'Critical');
      })
      .then(() => {
        expect(qb).to.deep.equal({
          name: '___TEST_SUBJECT|___TEST_ASPECT',
          value: '0',
          subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
          aspectId: aspObj.id,
          previousStatus: 'Invalid',
          statusChangedAt: '2018-10-29T22:42:30.938Z',
          status: 'Critical',
          relatedLinks: '[{\"name\":\"a\",\"url\":\"bcd\"}]',
          updatedAt: '2018-10-30T20:24:37.053Z',
        });

        done();
      })
      .catch(done);
  });

  it('removes related links with empty array', (done) => {
    let aspObj;
    const qb = {
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      value: '0',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
      relatedLinks: [],
    };
    const samp = {
      status: 'Critical',
      value: '1',
      previousStatus: 'Invalid',
      user: '{"name":"___testUser@refocus.com",' +
        '"email":"___testUser@refocus.com",' +
        '"profile":{"name":"___testProfile"}}',
      createdAt: '2018-10-29T22:42:30.938Z',
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
      aspectId: '50513365-f24f-455c-8d47-c507d1c62a96',
      relatedLinks: '[{\"name\":\"a\",\"url\":\"bcd\"}]',
      statusChangedAt: '2018-10-29T22:42:30.938Z',
      provider: '84f3560b-1b68-4868-bea3-8dd0ad8aa8f3',
      updatedAt: '2018-10-29T22:42:30.938Z',
    };

    tu.db.Aspect.create({
      description: 'this is a0 description',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: 'true',
      name: '___TEST_ASPECT',
      timeout: '30s',
      valueLabel: 's',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
      warningRange: [2, 3],
      infoRange: [4, 5],
      okRange: [6, 7],
    })
      .then((asp) => {
        aspObj = asp;
        qb.aspectId = asp.id;
        return updateSampleAttributes(qb, samp, 'Critical');
      })
      .then(() => {
        expect(qb).to.deep.equal({
          name: '___TEST_SUBJECT|___TEST_ASPECT',
          value: '0',
          subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
          aspectId: aspObj.id,
          previousStatus: 'Invalid',
          statusChangedAt: '2018-10-29T22:42:30.938Z',
          status: 'Critical',
          relatedLinks: '[]',
          updatedAt: '2018-10-30T20:24:37.053Z',
        });

        done();
      })
      .catch(done);
  });

  it('no change to related links if no related links attr', (done) => {
    let aspObj;
    const qb = {
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      value: '0',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
    };
    const samp = {
      status: 'Critical',
      value: '1',
      previousStatus: 'Invalid',
      user: '{"name":"___testUser@refocus.com",' +
        '"email":"___testUser@refocus.com",' +
        '"profile":{"name":"___testProfile"}}',
      createdAt: '2018-10-29T22:42:30.938Z',
      name: '___TEST_SUBJECT|___TEST_ASPECT',
      subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
      aspectId: '50513365-f24f-455c-8d47-c507d1c62a96',
      relatedLinks: '[{\"name\":\"a\",\"url\":\"bcd\"}]',
      statusChangedAt: '2018-10-29T22:42:30.938Z',
      provider: '84f3560b-1b68-4868-bea3-8dd0ad8aa8f3',
      updatedAt: '2018-10-29T22:42:30.938Z',
    };

    tu.db.Aspect.create({
      description: 'this is a0 description',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: 'true',
      name: '___TEST_ASPECT',
      timeout: '30s',
      valueLabel: 's',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
      warningRange: [2, 3],
      infoRange: [4, 5],
      okRange: [6, 7],
    })
      .then((asp) => {
        aspObj = asp;
        qb.aspectId = asp.id;
        return updateSampleAttributes(qb, samp, 'Critical');
      })
      .then(() => {
        expect(qb).to.deep.equal({
          name: '___TEST_SUBJECT|___TEST_ASPECT',
          value: '0',
          subjectId: 'd2dfc000-5498-4bf0-a8c4-9c42c4569f05',
          aspectId: aspObj.id,
          previousStatus: 'Invalid',
          statusChangedAt: '2018-10-29T22:42:30.938Z',
          status: 'Critical',
          relatedLinks: '[{\"name\":\"a\",\"url\":\"bcd\"}]',
          updatedAt: '2018-10-30T20:24:37.053Z',
        });

        done();
      })
      .catch(done);
  });
});
