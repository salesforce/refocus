/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectorGroups/create.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const httpStatus = require('../../../../api/v1/constants').httpStatus;
const tu = require('../../../testUtils');
const u = require('./utils');
const gu = require('../generators/utils');
const gtu = require('../generatorTemplates/utils');
const Collector = tu.db.Collector;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const expect = require('chai').expect;

describe('tests/api/v1/collectorGroups/create.js >', () => {
  let token;
  let coll1;
  let coll2;
  let coll3;
  let gen1;
  let gen2;
  let gen3;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    }).catch(done);
  });

  beforeEach(() => {
    coll1 = u.getCollectorToCreate();
    coll1.name += '1';
    coll2 = u.getCollectorToCreate();
    coll2.name += '2';
    coll3 = u.getCollectorToCreate();
    coll3.name += '3';
    return Promise.all([
      Collector.create(coll1),
      Collector.create(coll2),
      Collector.create(coll3),
    ]);
  });

  beforeEach(() => {
    gen1 = gu.getBasic({ name: 'gen1' });
    gen2 = gu.getBasic({ name: 'gen2' });
    gen3 = gu.getBasic({ name: 'gen3' });
    const generatorTemplate = gtu.getGeneratorTemplate();
    gu.createSGtoSGTMapping(generatorTemplate, gen1);
    gu.createSGtoSGTMapping(generatorTemplate, gen2);
    gu.createSGtoSGTMapping(generatorTemplate, gen3);
    gen1.isActive = true;
    gen2.isActive = true;
    gen3.isActive = true;
    return GeneratorTemplate.create(generatorTemplate)
    .then(() => Promise.all([
      Generator.create(gen1, {
        validate: false,
        include: Generator.options.defaultScope.include,
      }),
      Generator.create(gen2, {
        validate: false,
        include: Generator.options.defaultScope.include,
      }),
      Generator.create(gen3, {
        validate: false,
        include: Generator.options.defaultScope.include,
      }),
    ]));
  });

  afterEach(u.forceDelete);

  after(tu.forceDeleteUser);

  describe('create with collectors', () => {
    it('create collector group with empty collector list', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-empty-colls',
        description: 'coll-group-description-empty-colls',
      })
      .expect(httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('description');
        expect(res.body.name).to.be.equal('coll-group-name-empty-colls');
        expect(res.body.description)
        .to.be.equal('coll-group-description-empty-colls');
        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(0);
        return done();
      });
    });

    it('create collector group with 1 collector', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-one-collector',
        description: 'coll-group-description-one-collector',
        collectors: [coll1.name],
      })
      .expect(httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body.name).to.be.equal('coll-group-name-one-collector');
        expect(res.body).to.have.property('description');
        expect(res.body.description)
          .to.be.equal('coll-group-description-one-collector');
        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(1);
        const coll = res.body.collectors[0];
        expect(coll).to.have.keys('id', 'name', 'status');
        expect(coll.name).to.equal('___Coll1');
        expect(coll.status).to.equal('Stopped');
        return done();
      });
    });

    it('create collector group with more than one collector', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-2-collectors',
        description: 'coll-group-description-2-collectors',
        collectors: [coll1.name, coll2.name],
      })
      .expect(httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body.name).to.be.equal('coll-group-name-2-collectors');
        expect(res.body).to.have.property('description');
        expect(res.body.description)
          .to.be.equal('coll-group-description-2-collectors');
        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(2);
        return done();
      });
    });

    it('fail when one collector is already assigned', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({ // Creating a Collector Group with Collector 3
        name: 'coll-group',
        description: 'coll-description',
        collectors: [coll3.name],
      })
      .expect(httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
        .set('Authorization', token)
        .send({ // Creating a new Collector Group with one Coll assigned
          name: 'coll-group-must-fail',
          description: 'coll-description-must-fail',
          collectors: [coll1.name, coll3.name],
        })
        .expect(httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          // Must inform that coll 3 is already assigned
          const expectedMessage =
            'Cannot double-assign collector(s) [___Coll3] to collector groups';
          expect(res.body.errors[0])
          .to.have.property('message', expectedMessage);
          return done();
        });
      });
    });

    it('fail when more than one collector already assigned', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group',
        description: 'coll-group-description',
        collectors: [coll1.name, coll2.name],
      })
      .expect(httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
        .set('Authorization', token)
        .send({
          name: 'coll-group-name-fail-2',
          description: 'coll-group-description-fail-2',
          collectors: [coll1.name, coll2.name],
        })
        .expect(httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const expectedMessage = 'Cannot double-assign collector(s) ' +
            '[___Coll1, ___Coll2] to collector groups';

          expect(res.body.errors[0])
          .to.have.property('message', expectedMessage);
          return done();
        });
      });
    });

    it('ok when collector was previously assigned but group was deleted', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({ // Creating a Collector Group with Collector 3
        name: 'coll-group',
        description: 'coll-description',
        collectors: [coll3.name],
      })
      .expect(httpStatus.CREATED)
      .end(() => {
        api.delete('/v1/collectorGroups/coll-group')
        .set('Authorization', token)
        .expect(httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          api.post('/v1/collectorGroups')
          .set('Authorization', token)
          .send({ // Creating a new Collector Group with one Coll assigned
            name: 'coll-group-2',
            description: 'coll-description',
            collectors: [coll3.name],
          })
          .expect(httpStatus.CREATED)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body.collectors[0].name).to.equal(coll3.name);
            return done();
          });
        });
      });
    });
  });

  describe('create with generators', () => {
    it('create collector group with 1 generator', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-one-generator',
        description: 'coll-group-description-one-generator',
        generators: [gen1.name],
      })
      .expect(httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body.name).to.be.equal('coll-group-name-one-generator');
        expect(res.body).to.have.property('description');
        expect(res.body.description)
        .to.be.equal('coll-group-description-one-generator');
        expect(res.body).to.have.property('generators');
        expect(res.body.generators.length).to.be.equal(1);
        const gen = res.body.generators[0];
        expect(gen).to.have.keys('id', 'name', 'description', 'isActive', 'collectorGroup');
        expect(gen.name).to.equal('gen1');
        return done();
      });
    });

    it('create collector group with more than one generator', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-2-generators',
        description: 'coll-group-description-2-generators',
        generators: [gen1.name, gen2.name],
      })
      .expect(httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body.name).to.be.equal('coll-group-name-2-generators');
        expect(res.body).to.have.property('description');
        expect(res.body.description)
        .to.be.equal('coll-group-description-2-generators');
        expect(res.body).to.have.property('generators');
        expect(res.body.generators.length).to.be.equal(2);
        return done();
      });
    });

    it('fail when one generator is already assigned', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group',
        description: 'coll-description',
        generators: [gen3.name],
      })
      .expect(httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
        .set('Authorization', token)
        .send({
          name: 'coll-group-must-fail',
          description: 'coll-description-must-fail',
          generators: [gen1.name, gen3.name],
        })
        .expect(httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          // Must inform that gen 3 is already assigned
          const expectedMessage =
            'Cannot double-assign generator(s) [gen3] to collector groups';
          expect(res.body.errors[0])
          .to.have.property('message', expectedMessage);
          return done();
        });
      });
    });

    it('fail when more than one generator already assigned', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group',
        description: 'coll-group-description',
        generators: [gen1.name, gen2.name],
      })
      .expect(httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
        .set('Authorization', token)
        .send({
          name: 'coll-group-name-fail-2',
          description: 'coll-group-description-fail-2',
          generators: [gen1.name, gen2.name],
        })
        .expect(httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const expectedMessage = 'Cannot double-assign generator(s) ' +
            '[gen1, gen2] to collector groups';

          expect(res.body.errors[0])
          .to.have.property('message', expectedMessage);
          return done();
        });
      });
    });
  });

  describe('create with collectors and generators', () => {
    it('create collector group with 1 collector and 1 generator', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-one-collector-one-generator',
        description: 'coll-group-description-one-collector-one-generator',
        collectors: [coll1.name],
        generators: [gen1.name],
      })
      .expect(httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body.name).to.be.equal('coll-group-name-one-collector-one-generator');
        expect(res.body).to.have.property('description');
        expect(res.body.description)
        .to.be.equal('coll-group-description-one-collector-one-generator');

        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(1);
        const coll = res.body.collectors[0];
        expect(coll).to.have.keys('id', 'name', 'status');
        expect(coll.name).to.equal('___Coll1');
        expect(coll.status).to.equal('Stopped');

        expect(res.body).to.have.property('generators');
        expect(res.body.generators.length).to.be.equal(1);
        const gen = res.body.generators[0];
        expect(gen).to.have.keys('id', 'name', 'description', 'isActive', 'collectorGroup');
        expect(gen.name).to.equal('gen1');
        return done();
      });
    });

    it('create collector group with multiple collectors and generators', (done) => {
      api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-2-collectors-2-generators',
        description: 'coll-group-description-2-collectors-2-generators',
        collectors: [coll1.name, coll2.name],
        generators: [gen1.name, gen2.name],
      })
      .expect(httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body.name).to.be.equal('coll-group-name-2-collectors-2-generators');
        expect(res.body).to.have.property('description');
        expect(res.body.description)
        .to.be.equal('coll-group-description-2-collectors-2-generators');
        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(2);
        expect(res.body).to.have.property('generators');
        expect(res.body.generators.length).to.be.equal(2);
        return done();
      });
    });
  });
});
