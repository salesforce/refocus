/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectorGroups/get.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/collectorGroups';
const CollectorGroup = tu.db.CollectorGroup;
const Collector = tu.db.Collector;
const expect = require('chai').expect;
const getWithLimit = require('../common/getWithLimit.js').getWithLimit;

const collectorGrpObj = {
  name: `${tu.namePrefix}-CollGroup`,
  description: 'A test collector group',
};

describe('tests/api/v1/collectors/get.js >', () => {
  let token;
  let collectorGrp;
  before((done) => {
    tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
  });

  beforeEach((done) => {
    CollectorGroup.create(collectorGrpObj)
    .then((cg) => {
      collectorGrp = cg;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('get by name ok', (done) => {
    api.get(path + '/' + collectorGrpObj.name)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.id).to.equal(collectorGrp.id);
      })
      .end(done);
  });

  it('get by id ok', (done) => {
    api.get(path + '/' + collectorGrp.id)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.id).to.equal(collectorGrp.id);
      })
      .end(done);
  });

  it('find ok', (done) => {
    api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(1);
        expect(res.body[0].name).to.equal('___-CollGroup');
      })
      .end(done);
  });

  describe('with collectors > ', () => {
    let coll1;
    let coll2;
    beforeEach(() => {
      const collector1 = u.getCollectorToCreate();
      collector1.name += '1';
      return Collector.create(collector1)
        .then((c1) => {
          coll1 = c1;
          const collector2 = u.getCollectorToCreate();
          collector2.name += '2';
          return Collector.create(collector2);
        })
        .then((c2) => {
          coll2 = c2;
          return collectorGrp.addCollectors([coll1, c2]);
        });
    });

    it('get by name, returns collectors array', (done) => {
      api.get(path + '/' + collectorGrpObj.name)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body.id).to.equal(collectorGrp.id);
          expect(res.body.collectors.length).to.equal(2);

          /*
            Response has collector id, name, status and lastHeartbeat
            Returned collector list is not in particular order
           */
          const respColl = res.body.collectors;
          const collNamesInResp = [respColl[0].name, respColl[1].name];
          expect(collNamesInResp).to.have.members([coll1.name, coll2.name]);

          const collStatusInResp = [respColl[0].status, respColl[1].status];
          expect(collStatusInResp).to.have
            .members([coll1.status, coll2.status]);
        })
        .end(done);
    });

    it('get by id, returns collectors array', (done) => {
      api.get(path + '/' + collectorGrp.id)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body.id).to.equal(collectorGrp.id);
          expect(res.body.collectors.length).to.equal(2);

          /*
            Response has collector id, name, status and lastHeartbeat
            Returned collector list is not in particular order
           */
          const respColl = res.body.collectors;
          const collInResp = [respColl[0].name, respColl[1].name];
          expect(collInResp).to.have.members([coll1.name, coll2.name]);
        })
        .end(done);
    });

    it('find, returns collectors array', (done) => {
      api.get(path)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body.length).to.equal(1);
          expect(res.body[0].name).to.equal('___-CollGroup');
          expect(res.body[0].collectors.length).to.equal(2);

          /*
            Response has collector id, name, status and lastHeartbeat
            Returned collector list is not in particular order
           */
          const respColl = res.body[0].collectors;
          const collInResp = [respColl[0].name, respColl[1].name];
          expect(collInResp).to.have.members([coll1.name, coll2.name]);
        })
        .end(done);
    });
  });
});

describe('getWithLimit.js >', () => {
  const modelList = [];

  before((done) => {
    for (let i = 0; i < 10; i++) {
      const toCreate = {
        name: `${tu.namePrefix}-CollGroup`,
        description: 'A test collector group',
      };
      toCreate.name += `-limitTest${i}-${i % 2 ? 'odd' : 'even'}`;
      modelList.push(toCreate);
    }

    CollectorGroup.bulkCreate(modelList)
      .then(() => done())
      .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  getWithLimit(path);
});
