/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/putPatchWithoutPerms.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const gtUtil = u.gtUtil;
const User = tu.db.User;
const path = '/v1/generators';

describe('tests/api/v1/generators/putPatchWithoutPerms.js >', () => {
  let generator;
  let otherValidToken;
  const generatorToCreate = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  u.createSGtoSGTMapping(generatorTemplate, generatorToCreate);

  before((done) => {
    tu.createToken()
    .then(() => GeneratorTemplate.create(generatorTemplate))
    .then(() => Generator.create(generatorToCreate))
    .then((gen) => {
      generator = gen;
    })

    /*
     * tu.createToken creates a user and an admin user is already created so
     * use one of these.
     */
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => generator.addWriter(usr))
    .then(() => tu.createUser('myUNiqueUser'))
    .then((_usr) => tu.createTokenFromUserName(_usr.name))
    .then((tkn) => {
      otherValidToken = tkn;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('PUT without permission: should return 403', (done) => {
    const toPut =
    { name: 'refocus-ok-generator',
      description: 'Collect status data patched with name',
      tags: [
        'status',
        'STATUS',
      ],
      generatorTemplate: {
        name: generatorTemplate.name,
        version: generatorTemplate.version,
      },
      context: {
        okValue: {
          required: false,
          default: '0',
          description: 'An ok sample\'s value, e.g. \'0\'',
        },
      },
      subjects: ['US'],
      aspects: ['Temperature', 'Weather'],
    };

    api.put(`${path}/${generator.id}`)
    .set('Authorization', otherValidToken)
     .send(toPut)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray.length).to.equal(1);
      expect(errorArray[0].type).to.equal('ForbiddenError');
      return done();
    });
  });

  it('PATCH without permission: should return 403', (done) => {
    const toPatch = {
      name: 'New_Name',
    };
    api.patch(`${path}/${generator.id}`)
    .set('Authorization', otherValidToken)
    .send(toPatch)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray.length).to.equal(1);
      expect(errorArray[0].type).to.equal('ForbiddenError');
      return done();
    });
  });
});

