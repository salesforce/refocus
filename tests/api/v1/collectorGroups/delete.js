/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectorGroups/delete.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const httpStatus = require('../../../../api/v1/constants').httpStatus;
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;
const CollectorGroup = tu.db.CollectorGroup;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const expect = require('chai').expect;
const gtu = require('../../../db/model/generatortemplate/utils');
const gu = require('../../../db/model/generator/utils');

describe('tests/api/v1/collectorGroups/delete.js >', () => {
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

  it('ok - coll group is not used by any sample generators', (done) => {
    api.delete(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send()
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.isDeleted).to.be.greaterThan(0);
        return done();
      });
  });

  it('reject if no write perm', (done) => {
    api.delete(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token2)
      .send()
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

  it('reject if coll group is used by a sample generator', (done) => {
    const generatorTemplate = gtu.getGeneratorTemplate();
    let generator = JSON.parse(JSON.stringify(gu.getGenerator()));
    generator.name = tu.namePrefix + generator.name;
    generator.collectorGroupId = cg.get('id');
    GeneratorTemplate.create(generatorTemplate)
      .then(() => Generator.create(generator))
      .then((g) => (generator = g))
      .then(() => {
        api.delete(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send()
          .expect(httpStatus.BAD_REQUEST)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body.errors).to.have.lengthOf(1);
            expect(res.body.errors[0])
              .to.have.property('type', 'ValidationError');
            expect(res.body.errors[0]).to.have.property('message',
              'Cannot delete ___cg because it is still in use by sample ' +
              'generator(s) [___refocus-ok-generator]');
            return done();
          });
      })
      .catch(done);
  });
});
