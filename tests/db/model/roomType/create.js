/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/roomType/create.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const RoomType = tu.db.RoomType;
const invalidValue = '^thisValueisAlwaysInvalid#';

describe('db: roomType: create: ', () => {
  afterEach(u.forceDelete);

  describe('Create a new room type', () => {
    it('ok, room created', (done) => {
      RoomType.create(u.getStandard())
      .then((o) => {
        expect(o).to.have.property('name');
        expect(o).to.have.property('isEnabled').to.equal(true);
        expect(o).to.have.property('settings');
        expect(o).to.have.property('rules');
        done();
      })
    .catch(done);
    });

    it('ok, room type created isEnabled false', (done) => {
      const roomtype = u.getStandard();
      roomtype.isEnabled = false;
      RoomType.create(roomtype)
      .then((o) => {
        expect(o).to.have.property('name');
        expect(o).to.have.property('isEnabled').to.equal(false);
        done();
      })
    .catch(done);
    });

    it('fail, room type name invalid', (done) => {
      const roomtype = u.getStandard();
      roomtype.name = invalidValue;
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
    .catch(done);
    });

    it('fail, room type rules not array', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = {
        rule: {
          and: [
            { '>': [1, 0] },
            { '<': [1, 2] },
          ],
        },
        action: {
          name: 'Action1',
          parameters: [
            {
              name: 'Parameter1',
              value: 'Value1',
            },
            {
              name: 'Parameter2',
              value: 'Value2',
            },
            {
              name: 'Parameter3',
              value: 'Value3',
            },
          ],
        },
      };
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type rules missing rule', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = [
        {
          action: {
            name: 'Action1',
            parameters: [
              {
                name: 'Parameter1',
                value: 'Value1',
              },
              {
                name: 'Parameter2',
                value: 'Value2',
              },
              {
                name: 'Parameter3',
                value: 'Value3',
              },
            ],
          },
        },
      ];
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type rules missing action', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = [
        {
          rule: {
            and: [
              { '>': [1, 0] },
              { '<': [1, 2] },
            ],
          },
        },
      ];
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type rules criteria not array', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = {
        rule: {
          and: [
            { '>': [1, 0] },
            { '<': '[1, 2]' },
          ],
        },
        action: {
          name: 'Action1',
          parameters: [
            {
              name: 'Parameter1',
              value: 'Value1',
            },
            {
              name: 'Parameter2',
              value: 'Value2',
            },
            {
              name: 'Parameter3',
              value: 'Value3',
            },
          ],
        },
      };
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type rules criteria too many arguments', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = [
        {
          rule: {
            and: [
              { '>': [1, 3] },
              { '<': [1, 2, 3] },
            ],
          },
          action: {
            name: 'Action1',
            parameters: [
              {
                name: 'Parameter1',
                value: 'Value1',
              },
              {
                name: 'Parameter2',
                value: 'Value2',
              },
              {
                name: 'Parameter3',
                value: 'Value3',
              },
            ],
          },
        },
      ];
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type rules action missing name', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = [
        {
          rule: {
            and: [
              { '>': [1, 0] },
              { '<': [1, 2] },
            ],
          },
          action: {
            parameters: [
              {
                name: 'Parameter1',
                value: 'Value1',
              },
              {
                name: 'Parameter2',
                value: 'Value2',
              },
              {
                name: 'Parameter3',
                value: 'Value3',
              },
            ],
          },
        },
      ];
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type rules action missing parameters', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = [
        {
          rule: {
            and: [
              { '>': [1, 0] },
              { '<': [1, 2] },
            ],
          },
          action: {
            name: 'Action1',
          },
        },
      ];
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type rules action parameter missing name', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = [
        {
          rule: {
            and: [
              { '>': [1, 0] },
              { '<': [1, 2] },
            ],
          },
          action: {
            name: 'Action1',
            parameters: [
              {
                value: 'Value1',
              },
              {
                name: 'Parameter2',
                value: 'Value2',
              },
              {
                name: 'Parameter3',
                value: 'Value3',
              },
            ],
          },
        },
      ];
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type rules action parameter missing value', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = [
        {
          rule: {
            and: [
              { '>': [1, 0] },
              { '<': [1, 2] },
            ],
          },
          action: {
            name: 'Action1',
            parameters: [
              {
                name: 'Parameter1',
              },
              {
                name: 'Parameter2',
                value: 'Value2',
              },
              {
                name: 'Parameter3',
                value: 'Value3',
              },
            ],
          },
        },
      ];
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type rules action name invalid', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = [
        {
          rule: {
            and: [
              { '>': [1, 0] },
              { '<': [1, 2] },
            ],
          },
          action: {
            name: invalidValue,
            parameters: [
              {
                name: 'Parameter1',
                value: 'Value1',
              },
              {
                name: 'Parameter2',
                value: 'Value2',
              },
              {
                name: 'Parameter3',
                value: 'Value3',
              },
            ],
          },
        },
      ];
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, room type nest rule fails', (done) => {
      const roomtype = u.getStandard();
      roomtype.rules = [
        {
          rule: {
            and: [
              {
                and: [
                  { '>': [7, 8] },
                  { '<': '[9, 10]' },
                ],
              },
              { '<': [1, 2] },
            ],
          },
          action: {
            name: 'Action1',
            parameters: [
              {
                name: 'Parameter1',
                value: 'Value1',
              },
              {
                name: 'Parameter2',
                value: 'Value2',
              },
              {
                name: 'Parameter3',
                value: 'Value3',
              },
            ],
          },
        },
      ];
      RoomType.create(roomtype)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });
  });
});
