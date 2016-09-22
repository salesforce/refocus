/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/sample/upsert.js
 */
'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('db: sample: upsert: ', () => {
  afterEach(u.forceDelete);

  beforeEach((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect`,
      timeout: '30s',
      valueType: 'NUMERIC',
    })
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => done())
    .catch((err) => done(err));
  });

  it('when sample is new and when it already exists', (done) => {
    Sample.upsertByName({
      name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
      value: '1',
    })
    .should.eventually.have.deep.property('value', '1')
    .then(() => Sample.upsertByName({
      name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
      value: '2',
    }))
    .should.eventually.have.deep.property('value', '2')
    .then(() => done())
    .catch((err) => done(err));
  });

  it('When subject name changed then sample name should be changed',
  (done) => {
    let newSample;
    Sample.upsertByName({
      name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
      value: '1',
    })
    .then((samp) => {
      newSample = samp;
    })
    .then(() => {
      return Subject.scope({ method: ['absolutePath',
        `${tu.namePrefix}Subject`] }).find();
    })
    .then((subject) => {
      return subject.update({
        name: `${tu.namePrefix}Subject1`,
      });
    })
    .then(() => {
      // use delay for getting updated version of sample because it
      // gets updated in afterUpdate. So we receive the change in subject
      // as soon as it gets updated but sample update / heirarchy update
      // it does in background.
      setTimeout(() => {
        Sample.findById(newSample.dataValues.id)
        .then((sample) => {
          expect(sample.dataValues.name).to.contain(
            `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect`);
          done();
        });
      }, 500);
    })
    .catch((err) => done(err));
  });

  it('updateAt timestamp should change', (done) => {
    let newSample;
    Sample.upsertByName({
      name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
      value: '1',
    })
    .then((samp) => {
      newSample = samp;
    })
    .then(() => Sample.upsertByName({
      name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
      value: '1',
    }))
    .then((s) => {
      const newSampleUpdateTime = newSample.dataValues.updatedAt.getTime();
      const updatedSampleUpdateTime = s.dataValues.updatedAt.getTime();
      expect(updatedSampleUpdateTime).to.be.above(newSampleUpdateTime);
    })
    .then(() => done())
    .catch((err) => done(err));
  });

  it('subject does not exist', (done) => {
    Sample.upsertByName({
      name: `${tu.namePrefix}Subject|x`,
      value: '1',
    })
    .then(() => done('expecting to throw ResourceNotFoundError'))
    .catch((err) => {
      expect(err).to.have.property('name').to.equal('ResourceNotFoundError');
      done();
    });
  });

  it('aspect does not exist', (done) => {
    Sample.upsertByName({
      name: `x|${tu.namePrefix}Aspect`,
      value: '1',
    })
    .then(() => done('expecting to throw ResourceNotFoundError'))
    .catch((err) => {
      expect(err).to.have.property('name').to.equal('ResourceNotFoundError');
      done();
    });
  });
});
