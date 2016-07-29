/**
 * tests/db/model/aspect/find.js
 */
'use strict';

const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;

describe('db: aspect: find: ', () => {
  before((done) => {
    u.createMedium()
    .then(() => {
      return Aspect.create({
        name: 'luke',
        timeout: '1s',
        isPublished: true,
        tags: [
          { name: 'jedi', associatedModelName: 'Aspect' },
          { name: 'boring', associatedModelName: 'Aspect' }
        ],
      }, { include: Aspect.getAspectAssociations().tags });
    })
    .then(() => Aspect.create({
      name: 'leia',
      timeout: '1m',
      isPublished: true,
      tags: [
        { name: 'princess', associatedModelName: 'Aspect' },
        { name: 'jedi', associatedModelName: 'Aspect' }
      ],
    }, { include: Aspect.getAspectAssociations().tags }))
    .then(() => done())
    .catch((err) => {
      done(err);
    });
  });

  after(u.forceDelete);

  describe('find by name', () => {
    it('find by name, found', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => {
        if (o === null) {
          done(new Error('expecting record to be found'));
        } else {
          done();
        }
      })
      .catch((err) => done(err));
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
      .catch((err) => done(err));
    });
  });

  it('find by tag, found', (done) => {
    Aspect.findAll({
      include: [
        {
          association: Aspect.getAspectAssociations().tags,
          where: { name: 'jedi' }
        },
      ],
    })
    .then((o) => {
      if (o.length !== 2) {
        done(new Error('expecting two aspects'));
      }
    })
    .then(() => Aspect.findAll({
      include: [
        {
          association: Aspect.getAspectAssociations().tags,
          where: { name: 'boring' }
        },
      ],
    }))
    .then((o) => {
      if (o.length !== 1) {
        done(new Error('expecting one aspect'));
      }
    })
    .then(() => Aspect.findAll({
      include: [
        {
          association: Aspect.getAspectAssociations().tags,
          where: { name: 'father' }
        },
      ],
    }))
    .then((o) => {
      if (tu.gotArrayWithExpectedLength(o, 0)) {
        done();
      } else {
        done(new Error('expecting zero aspects'));
      }
    })
    .catch((err) => done(err));
  });

  it('find by tag using "tagNameIn" scope, found', (done) => {
    Aspect.scope([
      'defaultScope',
      { method: ['tagNameIn', ['jedi']] },
    ]).findAll()
    .then((o) => {
      if (o.length !== 2) {
        done(new Error('expecting two aspects'));
      }
    })
    .then(() => Aspect.scope(
      [
        'defaultScope',
        { method: ['tagNameIn', ['boring']] },
      ]
    ).findAll())
    .then((o) => {
      if (o.length !== 1) {
        done(new Error('expecting one aspect'));
      }
    })
    .then(() =>
      Aspect.scope([
        'defaultScope',
        { method: ['tagNameIn', ['father']] },
      ]).findAll()
    )
    .then((o) => {
      if (tu.gotArrayWithExpectedLength(o, 0)) {
        done();
      } else {
        done(new Error('expecting zero aspects'));
      }
    })
    .catch((err) => done(err));
  });

  it('tags and related links in default scope', (done) => {
    Aspect.findAll()
    .then((o) => {
      for (var i = 0; i < o.length; i++) {
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
    .catch((err) => done(err));
  });
});
