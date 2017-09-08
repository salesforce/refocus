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
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;

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
      .then((o) => {
        if (o === null) {
          done(new Error('expecting record to be found'));
        } else {
          done();
        }
      })
      .catch(done);
    });

    it('find by name, not found', (done) => {
      Aspect.findOne({ where: { name: 'x' } })
      .then((o) => {
        if (o === null) {
          done();
        } else {
          done(new Error('expecting record to not be found'));
        }
      })
      .catch(done);
    });
  });

  it('find by tag, found', (done) => {
    Aspect.findAll({
      where: { tags: { $contains: ['jedi'] } },
    })
    .then((o) => {
      if (o.length !== 2) {
        done(new Error('expecting two aspects'));
      }
    })
    .then(() => Aspect.findAll({
      where: { tags: { $contains: ['boring'] } },
    }))
    .then((o) => {
      if (o.length !== 1) {
        done(new Error('expecting one aspect'));
      }
    })
    .then(() => Aspect.findAll({
      where: { tags: { $contains: ['father'] } },
    }))
    .then((o) => {
      if (tu.gotArrayWithExpectedLength(o, 0)) {
        done();
      } else {
        done(new Error('expecting zero aspects'));
      }
    })
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
