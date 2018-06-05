/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/aspect/find.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Op = require('sequelize').Op;

describe('tests/db/model/aspect/find.js >', () => {
  before((done) => {
    u.createMedium()
    .then(() => {
      Aspect.create({
        name: 'luke',
        timeout: '1s',
        isPublished: true,
        tags: ['jedi', 'boring'],
      });
      Aspect.create({
        name: 'leia',
        timeout: '1m',
        isPublished: true,
        tags: ['princess', 'jedi'],
      });
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  describe('find by name >', () => {
    it('find by name, found', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => expect(o).to.have.property('name', u.name))
      .then(() => done())
      .catch(done);
    });

    it('find by name, not found', (done) => {
      Aspect.findOne({ where: { name: 'x' } })
      .then((o) => expect(o).to.be.null)
      .then(() => done())
      .catch(done);
    });
  });

  it('find by tag, found', (done) => {
    Aspect.findAll({
      where: { tags: { [Op.contains]: ['jedi'] } },
    })
    .then((o) => expect(o).to.have.lengthOf(2))
    .then(() => Aspect.findAll({
      where: { tags: { [Op.contains]: ['boring'] } },
    }))
    .then((o) => expect(o).to.have.lengthOf(1))
    .then(() => Aspect.findAll({
      where: { tags: { [Op.contains]: ['father'] } },
    }))
    .then((o) => expect(o).to.be.empty)
    .then(() => done())
    .catch(done);
  });

  it('tags and related links in default scope', (done) => {
    Aspect.findAll()
    .then((o) => {
      for (let i = 0; i < o.length; i++) {
        const el = o[i];
        if (el.get({ plain: true }).tags === undefined) {
          throw new Error('expecting "tags" attribute');
        }

        if (el.get({ plain: true }).relatedLinks === undefined) {
          throw new Error('expecting "relatedLinks" attribute');
        }
      }

      done();
    })
    .catch(done);
  });

  it('returns correct profile access field name', (done) => {
    expect(Aspect.getProfileAccessField()).to.equal('aspectAccess');
    done();
  });
});
