/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/create.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Generator = tu.db.Generator;

describe('db: Generator: create: ', () => {
  const generator = JSON.parse(JSON.stringify(u.getGenerator()));
  let userInst;
  beforeEach((done) => {
    tu.createUser('GeneratorOwner')
    .then((user) => {
      userInst = user;
      generator.createdBy = user.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, create with all fields', (done) => {
    Generator.create(generator)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.name).to.equal(generator.name);
      expect(o.description).to.equal(generator.description);
      expect(o.keywords).to.deep.equal(generator.keywords);
      expect(o.context).to.deep.equal(generator.context);
      expect(o.helpUrl).to.equal(generator.helpUrl);
      expect(o.helpEmail).to.equal(generator.helpEmail);
      expect(o.createdBy).to.equal(generator.createdBy);
      expect(o.isActive).to.equal(false);
      expect(o.generatorTemplate.name).to.equal('refocus-ok-template');
      expect(o.generatorTemplate.version).to.equal('1.0.0');
      expect(typeof o.getWriters).to.equal('function');
      expect(typeof o.getCollectors).to.equal('function');
      done();
    })
    .catch(done);
  });

  it('ok, create should set the creater as the sole writer ', (done) => {
    Generator.create(generator)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.createdBy).to.equal(generator.createdBy);
      return o.getWriters();
    })
    .then((writers) => {
      expect(writers.length).to.equal(1);
      expect(writers[0].id).to.equal(userInst.id);
      expect(writers[0].email).to.equal(userInst.email);
      expect(writers[0].name).to.equal(userInst.name);
      expect(writers[0].GeneratorWriters).to.not.equal(null);
      done();
    })
    .catch(done);
  });

  it('ok, isWritableBy should return true for createdBy user', (done) => {
    Generator.create(generator)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      return o.isWritableBy(o.createdBy);
    })
    .then((ret) => {
      expect(ret).to.equal(true);
      done();
    })
    .catch(done);
  });

  it('ok, no writers when createdBy is not specified', (done) => {
    const _g = JSON.parse(JSON.stringify(generator));
    delete _g.createdBy;
    Generator.create(_g)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.createdBy).to.equal(null);
      return o.getWriters();
    })
    .then((writers) => {
      expect(writers.length).to.equal(0);
      done();
    })
    .catch(done);
  });

  it('ok, create multiple generators', (done) => {
    const gSecond = JSON.parse(JSON.stringify(generator));
    gSecond.name = 'Second';
    const gThird = JSON.parse(JSON.stringify(generator));
    gThird.name = 'Third';
    const gFourth = JSON.parse(JSON.stringify(generator));
    gFourth.name = 'Fourh';
    Generator.bulkCreate([generator, gSecond, gThird, gFourth])
    .then(() => Generator.findAll())
    .then((o) => {
      expect(o.length).to.equal(4);
      done();
    })
    .catch();
  });

  it('not ok, name should be unique', (done) => {
    Generator.create(generator)
    .then(() => Generator.create(generator))
    .then(() => {
      done('Expecting Unique Constraint Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('Validation error');
      expect(err.name).to.contain('SequelizeUniqueConstraintError');
      expect(err.errors[0].message)
      .to.contain('lower(name::text) must be unique');
      done();
    });
  });

  it('version not ok, when version = 1.1.a', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.generatorTemplate.version = '1.1.a';
    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.errors[0].message)
      .to.contain('The version must match the semantic version format');
      expect(err.name).to.contain('SequelizeValidationError');
      done();
    });
  });

  it('not ok, with both subjects and subjectQuery present in ' +
    'the generator schema', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.subjects = ['Asia, America'];
    _generator.subjectQuery = '?subjects=A*';
    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message)
      .to.contain('Only one of ["subjects", "subjectQuery"] is required');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('eitherSubjectsORsubjectQuery');
      done();
    });
  });

  it('not ok, when both subjects and subjectQuery are not in ' +
    'generator schema', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    delete _generator.subjects;
    delete _generator.subjectQuery;
    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message)
      .to.contain('Only one of ["subjects", "subjectQuery"] is required');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('eitherSubjectsORsubjectQuery');
      done();
    });
  });
});
