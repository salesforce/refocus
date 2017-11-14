/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/lens/delete.js
 */
'use strict';
const path = require('path');
const fs = require('fs');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Lens = tu.db.Lens;
const Perspective = tu.db.Perspective;
const Subject = tu.db.Subject;

describe('tests/db/model/lens/delete.js >', () => {
  let lensLibrary;
  let subj;

  before((done) => {
    const mt = path.join(__dirname, './MultiTable.zip');
    lensLibrary = fs.readFileSync(mt); // eslint-disable-line no-sync
    Subject.create({
      name: `${tu.namePrefix}ABC`,
      isPublished: true,
    })
    .then((s) => {
      subj = s;
      return done();
    })
    .catch(done);
  });

  after(u.forceDelete);

  it('Delete OK, has no perspectives', (done) => {
    Lens.create({
      name: `${tu.namePrefix}noPersp`,
      sourceName: `${tu.namePrefix}noPersp`,
      description: 'd',
      sourceDescription: 'd',
      isPublished: true,
      library: lensLibrary,
    })
    .then((l) => l.destroy())
    .then((d) => {
      expect(d.isDeleted).to.not.equal(0);
    })
    .then(() => done())
    .catch(done);
  });

  it('Delete not allowed, still has perspectives', (done) => {
    let lensId;
    Lens.create({
      name: `${tu.namePrefix}hasPersp`,
      sourceName: `${tu.namePrefix}noPersp`,
      description: 'd',
      sourceDescription: 'd',
      isPublished: true,
      library: lensLibrary,
    })
    .then((l) => {
      lensId = l.id;
      return Perspective.create({
        name: `${tu.namePrefix}1`,
        rootSubject: subj.absolutePath,
        lensId,
      });
    })
    .then(() => Perspective.create({
      name: `${tu.namePrefix}2`,
      rootSubject: subj.absolutePath,
      lensId,
    }))
    .then(() => Lens.findOne({
      where: {
        name: `${tu.namePrefix}hasPersp`,
      },
    }))
    .then((l) => l.destroy())
    .then((d) => done(new Error(`Expecting validation error but got "${d}"`)))
    .catch((err) => {
      expect(err).to.have.property('name', 'ValidationError');
      expect(err.message).to.match(/Cannot delete .*/);
      return done();
    });
  });

  it('Unpublish OK, has no perspectives', (done) => {
    Lens.create({
      name: `${tu.namePrefix}UnPubnoPersp`,
      sourceName: `${tu.namePrefix}UnPubnoPersp`,
      description: 'd',
      sourceDescription: 'd',
      isPublished: true,
      library: lensLibrary,
    })
    .then((l) => l.update({ isPublished: false }))
    .then((l) => {
      expect(l.isPublished).to.equal(false);
    })
    .then(() => done())
    .catch(done);
  });

  it('Unpublish not allowed, still has perspectives', (done) => {
    let lensId;
    Lens.create({
      name: `${tu.namePrefix}UnPubhasPersp`,
      sourceName: `${tu.namePrefix}UnPubhasPersp`,
      description: 'd',
      sourceDescription: 'd',
      isPublished: true,
      library: lensLibrary,
    })
    .then((l) => {
      lensId = l.id;
      return Perspective.create({
        name: `${tu.namePrefix}u1`,
        rootSubject: subj.absolutePath,
        lensId,
      });
    })
    .then(() => Perspective.create({
      name: `${tu.namePrefix}u2`,
      rootSubject: subj.absolutePath,
      lensId,
    }))
    .then(() => Lens.findOne({
      where: {
        name: `${tu.namePrefix}UnPubhasPersp`,
      },
    }))
    .then((l) => l.update({ isPublished: false }))
    .then((l) => done(new Error(`Expecting validation error but got "${l}"`)))
    .catch((err) => {
      expect(err).to.have.property('name', 'ValidationError');
      expect(err.message).to.match(/Cannot unpublish .*/);
      return done();
    });
  });
});
