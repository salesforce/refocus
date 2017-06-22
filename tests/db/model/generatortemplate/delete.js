/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/delete.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const GeneratorTemplate = tu.db.GeneratorTemplate;

describe('db: Generatortemplate: delete: ', () => {
  const gt = u.getGeneratorTemplate();

  afterEach(u.forceDelete);

  it('ok, soft delete successful', (done) => {
    GeneratorTemplate.create(gt)
    .then((o) => o.destroy())
    .then((o) => {
      expect(o.deletedAt).to.not.equal(null);
      done();
    })
    .catch(done);
  });

  it('ok, should be able to find a template once deleted', (done) => {
    GeneratorTemplate.create(gt)
    .then((o) => o.destroy())
    .then((o) => GeneratorTemplate.findById(o.id))
    .then((o) => {
      expect(o).to.equal(null);
      done();
    })
    .catch(done);
  });
});
