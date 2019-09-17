/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/aspects/writersRangesTags.js
 */
'use strict'; // eslint-disable-line strict
const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised')).should();
const Promise = require('bluebird');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const Aspect = tu.db.Aspect;
const redisOps = rtu.redisOps;

Function.prototype.where = function (...args) {
  return this.bind(null, ...args);
};

Function.prototype.for = function (arg) {
  return this.bind(arg);
};

describe('tests/cache/models/aspects/writersRangesTags.js >', () => {
  const asp1 = {
    name: 'asp1',
    timeout: '30s',
    isPublished: true,
    valueType: 'NUMERIC',
  };

  const asp2 = {
    name: 'asp2',
    timeout: '30s',
    isPublished: true,
    valueType: 'NUMERIC',
  };

  let user1;
  let user2;
  let user3;
  before(() =>
    Promise.all([
      tu.createUser('user1'),
      tu.createUser('user2'),
      tu.createUser('user3'),
    ])
    .then(([u1, u2, u3]) => {
      user1 = u1;
      user2 = u2;
      user3 = u3;
    })
  );

  afterEach(rtu.forceDelete);
  after(tu.forceDeleteUser);

  describe('create >', () => {
    describe('tags >', () => {
      it('tags', () =>
        createWithTags(['tag1', 'tag2'])
        .then(expectTags.where(['tag1', 'tag2']))
      );

      it('empty tags', () =>
        createWithTags([])
        .then(expectTagsEmpty)
      );

      it('no tags', () =>
        createWithTags()
        .then(expectTagsEmpty)
      );
    });

    describe('writers >', () => {
      it('writers', () =>
        createWithWriters([user1, user2])
        .then(expectWriters.where([user1.name, user2.name]))
      );

      it('empty writers', () =>
        createWithWriters([])
        .then(expectWritersEmpty)
      );

      it('no writers', () =>
        createWithWriters()
        .then(expectWritersEmpty)
      );
    });

    describe('ranges >', () => {
      it('ranges', () =>
        createWithRanges({
          okRange: [0, 1],
          infoRange: [2, 3],
          warningRange: [4, 5],
          criticalRange: [6, 7],
        })
        .then(expectRanges.where([
          '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
          '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5', '0:min:Critical:6',
          '6', '1:max:Critical:7', '7',
        ]))
      );

      it('ok only', () =>
        createWithRanges({
          okRange: [0, 1],
        })
        .then(expectRanges.where([
          '0:min:OK:0', '0', '1:max:OK:1', '1',
        ]))
      );

      it('no ranges', () =>
        createWithRanges({})
        .then(expectRangesEmpty)
      );
    });

    describe('all >', () => {
      it('all', () =>
        createWithAll({
          tags: ['tag1', 'tag2'],
          writers: [user1, user2],
          ranges: {
            okRange: [0, 1],
            infoRange: [2, 3],
            warningRange: [4, 5],
            criticalRange: [6, 7],
          },
        })
        .then(expectAll.where({
          tags: ['tag1', 'tag2'],
          writers: [user1.name, user2.name],
          ranges: [
            '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
            '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5', '0:min:Critical:6',
            '6', '1:max:Critical:7', '7',
          ],
        }))
      );
    });

    describe('isPublished=false >', () => {
      it('isPublished=false', () =>
        createWithAllUnpublished({
          tags: ['tag1', 'tag2'],
          writers: [user1, user2],
          ranges: {
            okRange: [0, 1],
            infoRange: [2, 3],
            warningRange: [4, 5],
            criticalRange: [6, 7],
          },
        })
        .then(expectAllEmpty)
      );
    });
  });

  describe('update >', () => {
    describe('renamed >', () => {
      beforeEach(() =>
        createWithAll({
          tags: ['tag1', 'tag2'],
          writers: [user1, user2],
          ranges: {
            okRange: [0, 1],
          },
        })
      );

      it('renamed, isPublished=true', () => Promise.resolve()
        .then(expectAll.where({
          tags: ['tag1', 'tag2'],
          writers: [user1.name, user2.name],
          ranges: ['0:min:OK:0', '0', '1:max:OK:1', '1'],
        }))
        .then(rename.where(asp1, asp2))
        .then(expectAllEmpty.for(asp1))
        .then(expectAll.for(asp2).where({
          tags: ['tag1', 'tag2'],
          writers: [user1.name, user2.name],
          ranges: ['0:min:OK:0', '0', '1:max:OK:1', '1'],
        }))
      );

      it('renamed, isPublished=false', () => Promise.resolve()
        .then(unPublish)
        .then(expectAllEmpty)
        .then(rename.where(asp1, asp2))
        .then(expectAllEmpty.for(asp1))
        .then(expectAllEmpty.for(asp2))
      );
    });

    describe('unpublished >', () => {
      beforeEach(() =>
        createWithAll({
          tags: ['tag1', 'tag2'],
          writers: [user1, user2],
          ranges: {
            okRange: [0, 1],
          },
        })
      );

      it('unpublished', () => Promise.resolve()
        .then(expectAll.where({
          tags: ['tag1', 'tag2'],
          writers: [user1.name, user2.name],
          ranges: ['0:min:OK:0', '0', '1:max:OK:1', '1'],
        }))
        .then(unPublish)
        .then(expectAllEmpty)
      );
    });

    describe('published >', () => {
      beforeEach(() =>
        createWithAllUnpublished({
          tags: ['tag1', 'tag2'],
          writers: [user1, user2],
          ranges: {
            okRange: [0, 1],
          },
        })
      );

      it('published', () => Promise.resolve()
        .then(expectAllEmpty)
        .then(publish)
        .then(expectAll.where({
          tags: ['tag1', 'tag2'],
          writers: [user1.name, user2.name],
          ranges: ['0:min:OK:0', '0', '1:max:OK:1', '1'],
        }))
      );
    });

    describe('tags/writers/ranges changed >', () => {
      describe('isPublished=true >', () => {
        beforeEach(() =>
          createWithAll({
            tags: ['tag1', 'tag2'],
            writers: [user1, user2],
            ranges: {
              okRange: [0, 1],
              infoRange: [2, 3],
              warningRange: [4, 5],
            },
          })
        );

        describe('tags changed >', () => {
          it('add', () => Promise.resolve()
            .then(expectTags.where(['tag1', 'tag2']))
            .then(updateWithTags.where(['tag1', 'tag2', 'tag3']))
            .then(expectTags.where(['tag1', 'tag2', 'tag3']))
          );

          it('remove', () => Promise.resolve()
            .then(expectTags.where(['tag1', 'tag2']))
            .then(updateWithTags.where(['tag1']))
            .then(expectTags.where(['tag1']))
          );

          it('add/remove', () => Promise.resolve()
            .then(expectTags.where(['tag1', 'tag2']))
            .then(updateWithTags.where(['tag2', 'tag3']))
            .then(expectTags.where(['tag2', 'tag3']))
          );

          it('replace', () => Promise.resolve()
            .then(expectTags.where(['tag1', 'tag2']))
            .then(updateWithTags.where(['tag3', 'tag4']))
            .then(expectTags.where(['tag3', 'tag4']))
          );

          it('remove all', () => Promise.resolve()
            .then(expectTags.where(['tag1', 'tag2']))
            .then(updateWithTags.where([]))
            .then(expectTags.where([]))
          );
        });

        describe('writers changed >', () => {
          it('add', () => Promise.resolve()
            .then(expectWriters.where([user1.name, user2.name]))
            .then(updateWithWriters.where([user1, user2, user3]))
            .then(expectWriters.where([user1.name, user2.name, user3.name]))
          );

          it('remove', () => Promise.resolve()
            .then(expectWriters.where([user1.name, user2.name]))
            .then(updateWithWriters.where([user1]))
            .then(expectWriters.where([user1.name]))
          );

          it('add/remove', () => Promise.resolve()
            .then(expectWriters.where([user1.name, user2.name]))
            .then(updateWithWriters.where([user1, user3]))
            .then(expectWriters.where([user1.name, user3.name]))
          );

          it('replace', () => Promise.resolve()
            .then(expectWriters.where([user1.name, user2.name]))
            .then(updateWithWriters.where([user3]))
            .then(expectWriters.where([user3.name]))
          );

          it('remove all', () => Promise.resolve()
            .then(expectWriters.where([user1.name, user2.name]))
            .then(updateWithWriters.where([]))
            .then(expectWriters.where([]))
          );
        });

        describe('ranges changed >', () => {
          it('update', () => Promise.resolve()
            .then(expectRanges.where([
              '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
              '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5',
            ]))
            .then(updateWithRanges.where({
              okRange: [0, 2],
              infoRange: [3, 5],
              warningRange: [6, 8],
            }))
            .then(expectRanges.where([
              '0:min:OK:0', '0', '1:max:OK:2', '2', '0:min:Info:3', '3', '1:max:Info:5',
              '5', '0:min:Warning:6', '6', '1:max:Warning:8', '8',
            ]))
          );

          it('add', () => Promise.resolve()
            .then(expectRanges.where([
              '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
              '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5',
            ]))
            .then(updateWithRanges.where({
              criticalRange: [6, 8],
            }))
            .then(expectRanges.where([
              '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
              '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5', '0:min:Critical:6',
              '6', '1:max:Critical:8', '8',
            ]))
          );

          it('remove', () => Promise.resolve()
            .then(expectRanges.where([
              '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
              '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5',
            ]))
            .then(updateWithRanges.where({
              warningRange: null,
            }))
            .then(expectRanges.where([
              '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
              '3',
            ]))
          );

          it('add/remove', () => Promise.resolve()
            .then(expectRanges.where([
              '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
              '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5',
            ]))
            .then(updateWithRanges.where({
              okRange: null,
              criticalRange: [6, 8],
            }))
            .then(expectRanges.where([
              '0:min:Info:2', '2', '1:max:Info:3',
              '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5', '0:min:Critical:6',
              '6', '1:max:Critical:8', '8',
            ]))
          );

          it('replace', () => Promise.resolve()
            .then(expectRanges.where([
              '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
              '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5',
            ]))
            .then(updateWithRanges.where({
              okRange: null,
              infoRange: null,
              warningRange: null,
              criticalRange: [6, 8],
            }))
            .then(expectRanges.where([
              '0:min:Critical:6', '6', '1:max:Critical:8', '8',
            ]))
          );

          it('remove all', () => Promise.resolve()
            .then(expectRanges.where([
              '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
              '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5',
            ]))
            .then(updateWithRanges.where({
              okRange: null,
              infoRange: null,
              warningRange: null,
              criticalRange: null,
            }))
            .then(expectRanges.where([]))
          );
        });

        describe('all changed >', () => {
          it('all', () => Promise.resolve()
            .then(expectAll.where({
              tags: ['tag1', 'tag2'],
              writers: [user1.name, user2.name],
              ranges: [
                '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
                '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5',
              ],
            }))
            .then(updateWithAll.where({
                tags: ['tag3'],
                writers: [user1],
                ranges: {
                  okRange: [0, 2],
                  infoRange: [3, 5],
                  warningRange: [6, 8],
                },
              })
            )
            .then(expectAll.where({
              tags: ['tag3'],
              writers: [user1.name],
              ranges: [
                '0:min:OK:0', '0', '1:max:OK:2', '2', '0:min:Info:3', '3', '1:max:Info:5',
                '5', '0:min:Warning:6', '6', '1:max:Warning:8', '8',
              ],
            }))
          );
        });
      });

      describe('isPublished=false >', () => {
        beforeEach(() =>
          createWithAllUnpublished({
            tags: ['tag1', 'tag2'],
            writers: [user1, user2],
            ranges: {
              okRange: [0, 1],
              infoRange: [2, 3],
              warningRange: [4, 5],
            },
          })
        );

        describe('tags changed >', () => {
          it('add', () => Promise.resolve()
            .then(expectTagsEmpty)
            .then(updateWithTags.where(['tag1', 'tag2', 'tag3']))
            .then(expectTagsEmpty)
          );
        });

        describe('writers changed >', () => {
          it('add', () => Promise.resolve()
            .then(expectWritersEmpty)
            .then(updateWithWriters.where([user1, user2, user3]))
            .then(expectWritersEmpty)
          );
        });

        describe('ranges changed >', () => {
          it('update', () => Promise.resolve()
            .then(expectRangesEmpty)
            .then(updateWithRanges.where({
              okRange: [0, 2],
              infoRange: [3, 5],
              warningRange: [6, 8],
            }))
            .then(expectRangesEmpty)
          );

          it('add', () => Promise.resolve()
            .then(expectRangesEmpty)
            .then(updateWithRanges.where({
              criticalRange: [6, 8],
            }))
            .then(expectRangesEmpty)
          );
        });

        describe('all changed >', () => {
          it('all', () => Promise.resolve()
            .then(expectAllEmpty)
            .then(updateWithAll.where({
                tags: ['tag3'],
                writers: [user1],
                ranges: {
                  okRange: [0, 2],
                  infoRange: [3, 5],
                  warningRange: [6, 8],
                  criticalRange: [9, 11],
                },
              })
            )
            .then(expectAllEmpty)
          );
        });
      });
    });

    describe('other fields changed >', () => {
      beforeEach(() =>
        createWithAll({
          tags: ['tag1', 'tag2'],
          writers: [user1, user2],
          ranges: {
            okRange: [0, 1],
          },
        })
      );

      it('other fields changed', () => Promise.resolve()
        .then(expectAll.where({
          tags: ['tag1', 'tag2'],
          writers: [user1.name, user2.name],
          ranges: ['0:min:OK:0', '0', '1:max:OK:1', '1'],
        }))
        .then(update.where({ timeout: '10s', description: '...' }))
        .then(expectAll.where({
          tags: ['tag1', 'tag2'],
          writers: [user1.name, user2.name],
          ranges: ['0:min:OK:0', '0', '1:max:OK:1', '1'],
        }))
      );
    });
  });

  describe('destroy >', () => {
    beforeEach(() =>
      createWithAll({
        tags: ['tag1', 'tag2'],
        writers: [user1, user2],
        ranges: {
          okRange: [0, 1],
          infoRange: [2, 3],
          warningRange: [4, 5],
          criticalRange: [6, 7],
        },
      })
    );

    it('all', () => Promise.resolve()
      .then(expectAll.where({
        tags: ['tag1', 'tag2'],
        writers: [user1.name, user2.name],
        ranges: [
          '0:min:OK:0', '0', '1:max:OK:1', '1', '0:min:Info:2', '2', '1:max:Info:3',
          '3', '0:min:Warning:4', '4', '1:max:Warning:5', '5', '0:min:Critical:6',
          '6', '1:max:Critical:7', '7',
        ],
      }))
      .then(destroy)
      .then(expectAllEmpty)
    );
  });

  function createWithTags(tags) {
    const asp = this || asp1;
    return Aspect.create({ ...asp, tags });
  }

  function createWithWriters(writers) {
    const asp = this || asp1;
    return Aspect.create(asp)
    .then((asp) => writers && asp.setWriters(writers))
    .then(() => {});
  }

  function createWithRanges(ranges) {
    const asp = this || asp1;
    return Aspect.create({ ...asp, ...ranges });
  }

  function createWithAll({ tags, writers, ranges }) {
    const asp = this || asp1;
    return Aspect.create({ ...asp, tags, ...ranges, })
    .then((asp) => writers && asp.setWriters(writers))
    .then(() => {});
  }

  function createWithAllUnpublished({ tags, writers, ranges }) {
    const asp = this || asp1;
    return Aspect.create({ ...asp, tags, ...ranges, isPublished: false })
    .then((asp) => writers && asp.setWriters(writers))
    .then(() => {});
  }

  function update(props) {
    const asp = this || asp1;
    return Aspect.update(props, {
      where: { name: asp.name },
      individualHooks: true,
    });
  }

  function rename(from, to) {
    return update.call(from, { name: to.name });
  }

  function publish() {
    const asp = this || asp1;
    return update.call(asp, { isPublished: true });
  }

  function unPublish() {
    const asp = this || asp1;
    return update.call(asp, { isPublished: false });
  }

  function updateWithTags(tags) {
    const asp = this || asp1;
    return update.call(asp, { tags });
  }

  function updateWithWriters(writers) {
    const asp = this || asp1;
    return Aspect.findOne({
      where: { name: asp.name },
    })
    .then((asp) =>
      asp.setWriters(writers)
    );
  }

  function updateWithRanges(ranges) {
    const asp = this || asp1;
    return update.call(asp, { ...ranges });
  }

  function updateWithAll({ tags, writers, ranges }) {
    const asp = this || asp1;
    return Promise.join(
      update.call(asp, { tags, ...ranges }),
      Aspect.findOne({
        where: { name: asp.name },
      }).then((asp) =>
        asp.setWriters(writers)
      ),
    );
  }

  function getTags() {
    const asp = this || asp1;
    return redisOps.getTags(asp);
  }

  function getWriters() {
    const asp = this || asp1;
    return redisOps.getWriters(asp);
  }

  function getRanges() {
    const asp = this || asp1;
    return redisOps.getRanges(asp);
  }

  function getAll() {
    const asp = this || asp1;
    return redisOps.getTagsWritersRanges(asp);
  }

  function destroy() {
    const asp = this || asp1;
    return Aspect.destroy({
      where: { name: asp.name },
      individualHooks: true,
    });
  }

  function expectTags(expected) {
    const asp = this || asp1;
    return getTags.call(asp)
    .should.eventually.have.members(expected);
  }

  function expectWriters(expected) {
    const asp = this || asp1;
    return getWriters.call(asp)
    .should.eventually.have.members(expected);
  }

  function expectRanges(expected) {
    const asp = this || asp1;
    return getRanges.call(asp)
    .should.eventually.deep.equal(expected);
  }

  function expectAll({ tags, writers, ranges }) {
    const asp = this || asp1;
    return getAll.call(asp)
    .then((ret) => {
      expect(ret.tags).to.have.members(tags);
      expect(ret.writers).to.have.members(writers);
      expect(ret.ranges).to.deep.equal(ranges);
    });
  }

  function expectTagsEmpty() {
    const asp = this || asp1;
    return expectTags.call(asp, []);
  }

  function expectWritersEmpty() {
    const asp = this || asp1;
    return expectWriters.call(asp, []);
  }

  function expectRangesEmpty() {
    const asp = this || asp1;
    return expectRanges.call(asp, []);
  }

  function expectAllEmpty() {
    const asp = this || asp1;
    return expectAll.call(asp, { tags: [], writers: [], ranges: [] });
  }
});

