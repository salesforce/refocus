/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectorGroups/patch.js
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

describe('tests/api/v1/collectorGroups/patch.js >', () => {
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
        return CollectorGroup.createCollectorGroup({
          name: `${tu.namePrefix}cg2`,
          description: 'desc2',
          createdBy: user.id,
          collectors: [collector3.name],
        });
      })
      .then(() => done())
      .catch(done);
  });

  afterEach(u.forceDelete);

  after(tu.forceDeleteUser);

  it('patch with empty collector list', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ description: 'new desc', collectors: [] })
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('description', 'new desc');
        expect(res.body.collectors).to.be.empty;
        return done();
      });
  });

  it('patch with valid collectors', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({
        description: 'hi',
        collectors: [collector1.name, collector2.name],
      })
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name', cg.name);
        expect(res.body).to.have.property('description', 'hi');
        expect(res.body.collectors).to.have.lengthOf(2);
        return done();
      });
  });

  it('patch replaces collectors', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ collectors: [collector1.name] })
      .expect(httpStatus.OK)
      .end((err) => {
        if (err) {
          return done(err);
        }

        return api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({ collectors: [collector2.name] })
          .expect(httpStatus.OK)
          .end((_err, _res) => {
            if (_err) {
              return done(_err);
            }

            expect(_res.body).to.have.property('name', cg.name);
            expect(_res.body.collectors).to.have.lengthOf(1);
            expect(_res.body.collectors[0])
              .to.have.property('name', collector2.name);
            return done();
          });
      });
  });

  it('reject if collector already in a different collector group', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ collectors: [collector3.name] })
      .expect(httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.lengthOf(1);
        expect(res.body.errors[0]).to.have.property('message',
          'Cannot double-assign collector(s) [___Coll3] to collector groups');
        expect(res.body.errors[0]).to.have.property('type', 'ValidationError');
        done();
      });
  });

  it('reject if no write perm', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token2)
      .send({ description: 'foo', collectors: [collector1.name] })
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
});
