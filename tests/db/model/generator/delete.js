/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/delete.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;

describe('tests/db/model/generator/delete.js >', () => {
  const generator = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();

  before((done) => {
    GeneratorTemplate.create(generatorTemplate)
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(gtUtil.forceDelete);

  it('ok, delete successful', (done) => {
    Generator.create(generator)
    .then((o) => o.destroy())
    .then(() => Generator.findAll({ where: { name: generator.name } }))
    .then((found) => expect(found).to.have.length(0))
    .then(() => done())
    .catch(done);
  });

  it('ok, should not be able to find a generator once deleted', (done) => {
    Generator.create(generator)
    .then((o) => o.destroy())
    .then((o) => Generator.findByPk(o.id))
    .then((o) => expect(o).to.be.null)
    .then(() => done())
    .catch(done);
  });

  it('ok, should be able to create generator with the same name ' +
    'as the one deleted', (done) => {
    Generator.create(generator)
    .then((o) => o.destroy())
    .then(() => Generator.create(generator))
    .then((o) => expect(o).to.have.property('name', generator.name))
    .then(() => done())
    .catch(done);
  });
});
