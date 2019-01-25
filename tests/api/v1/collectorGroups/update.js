/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectorGroups/update.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const httpStatus = require('../../../../api/v1/constants').httpStatus;
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;
const CollectorGroup = tu.db.CollectorGroup;
const expect = require('chai').expect;

describe('tests/api/v1/collectorGroups/update.js >', () => {
  let user;
  let token;
  let token2;
  let collector1;
  let collector2;
  let collector3;
  let cg = { name: '' };

  before((done) => {
    tu.createUserAndToken()
      .then((ut) => {
        user = ut.user;
        token = ut.token;
        return tu.createSecondUser();
      })
      .then((user2) => tu.createTokenFromUserName(user2.get('name')))
      .then((t) => (token2 = t))
      .then(() => done())
      .catch(done);
  });

  beforeEach(() => {
    collector1 = u.getCollectorToCreate();
    collector1.name += '1';
    Collector.create(collector1);
    collector2 = u.getCollectorToCreate();
    collector2.name += '2';
    Collector.create(collector2);
    collector3 = u.getCollectorToCreate();
    collector3.name += '3';
    Collector.create(collector3);
  });

  beforeEach((done) => {
    CollectorGroup.createCollectorGroup({
      name: `${tu.namePrefix}cg`,
      description: 'desc',
      createdBy: user.id,
    })
      .then((created) => {
        cg = created;
        done();
      })
      .catch(done);
  });

  afterEach(u.forceDelete);

  after(tu.forceDeleteUser);

  it('invalid empty collector list', (done) => {
    api.post(`/v1/collectorGroups/${cg.name}/collectors`)
      .set('Authorization', token)
      .send([])
      .expect(httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.lengthOf(1);
        expect(res.body.errors[0]).to.have.property('message',
          'Request validation failed: Parameter (queryBody) is too short ' +
          '(0), minimum 1');
        return done();
      });
  });

  it('set collectors', (done) => {
    api.post(`/v1/collectorGroups/${cg.name}/collectors`)
      .set('Authorization', token)
      .send([collector1.name, collector2.name])
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name', cg.name);
        expect(res.body).to.have.property('description', cg.description);
        expect(res.body.collectors).to.have.lengthOf(2);
        return done();
      });
  });

  it('fail double-assign', (done) => {
    api.post(`/v1/collectorGroups/${cg.name}/collectors`)
      .set('Authorization', token)
      .send([collector1.name])
      .expect(httpStatus.OK)
      .end((err) => {
        if (err) {
          return done(err);
        }

        return api.post(`/v1/collectorGroups/${cg.name}/collectors`)
          .set('Authorization', token)
          .send([collector1.name, collector2.name])
          .expect(httpStatus.BAD_REQUEST)
          .end((_err, _res) => {
            if (_err) {
              return done(_err);
            }

            expect(_res.body.errors).to.have.lengthOf(1);
            expect(_res.body.errors[0]).to.have.property('message', 'Cannot ' +
              'double-assign collector(s) [___Coll1] to collector groups');
            return done();
          });
      });
  });

  it('reject if no write perm', (done) => {
    api.post(`/v1/collectorGroups/${cg.name}/collectors`)
      .set('Authorization', token2)
      .send([collector1.name])
      .expect(httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.lengthOf(1);
        expect(res.body.errors[0]).to.have.property('type', 'ForbiddenError');
        done();
      });
  });

  it('delete collectors from group', (done) => {
    api.post(`/v1/collectorGroups/${cg.name}/collectors`)
      .set('Authorization', token)
      .send([collector1.name, collector2.name])
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        api.delete(`/v1/collectorGroups/${cg.name}/collectors`)
          .set('Authorization', token)
          .send([collector1.name, collector2.name])
          .expect(httpStatus.OK)
          .end((_err, _res) => {
            if (_err) return done(_err);
            expect(res.body.collectors).to.have.lengthOf(1);
            expect(res.body.collectors[0])
              .to.have.property('name', collector1.name);
            return done();
          });
      });
  });

  it('error delete empty array of collectors from group', (done) => {
    api.delete(`/v1/collectorGroups/${cg.name}/collectors`)
      .set('Authorization', token)
      .send([])
      .expect(httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.errors).to.have.lengthOf(1);
        const expectedMsg = 'Request validation failed: Parameter ' +
          '(queryBody) is too short (0), minimum 1';
        expect(res.body.errors[0]).to.have.property('message', expectedMsg);
        return done();
      });
  });
});
