/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generator/patch.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Generator = tu.db.Generator;
const path = '/v1/generators';
const expect = require('chai').expect;

describe(`api: PATCH ${path}`, () => {
  let i = 0;
  const generatorToCreate = u.getGenerator();
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Generator.create(generatorToCreate)
    .then((gen) => {
      i = gen.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('simple patching: ok', (done) => {
    const newName =  {
      name: 'New_Name',
    };
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send(newName)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.name).to.equal(newName.name);
    })
    .end((err /* , res */) => {
      return err ? done(err) : done();
    });
  });

  it('patch complex json schema', (done) => {
    const toPatch = {
      generatorTemplate: {
        name: 'refocus-ok-generator-template_V1',
        version: '^1.0.0'
      },
      context: {
        okValue: {
          required: true,
          default: '1',
          description: 'An ok sample\'s value, e.g. \'0\'',
        },
        criticalValue: {
          required: true,
          default: '2',
          description: 'A critical sample\'s value, e.g. \'1\'',
        },
      },
    };
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send(toPatch)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.generatorTemplate).to.deep.equal(toPatch.generatorTemplate);
      expect(res.body.context).to.deep.equal(toPatch.context);
    })
    .end((err /* , res */) => {
      return err ? done(err) : done();
    });
  });

  it('switch isActive from false to true', (done) => {
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send({ isActive: true })
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.isActive).to.equal(true);
    })
    .end((err /* , res */) => {
      return err ? done(err) : done();
    });
  });
});
