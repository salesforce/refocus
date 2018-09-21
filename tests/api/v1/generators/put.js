/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/put.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const gtUtil = u.gtUtil;
const path = '/v1/generators';
const expect = require('chai').expect;
const ZERO = 0;

describe('tests/api/v1/generators/put.js >', () => {
  let token;
  let generatorId = 0;
  const generatorToCreate = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  u.createSGtoSGTMapping(generatorTemplate, generatorToCreate);

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Generator.create(generatorToCreate))
    .then((gen) => {
      generatorId = gen.id;
      done();
    })
    .then(u.createGeneratorAspects())
    .catch((err) => {
      done(err);
    });
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('simple put: ok', (done) => {
    const toPut = {
      name: 'refocus-ok-generator',
      description: 'Collect status data',
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
      subjectQuery: '?absolutePath=Foo.*',
      aspects: ['Temperature', 'Weather'],
    };

    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.subjectQuery).to.equal('?absolutePath=Foo.*');

      // aspect names are saved lowercase
      expect(res.body.aspects).to.be.an('array').with.lengthOf(2);
      expect(res.body.aspects[0]).to.equal('temperature');
      expect(res.body.aspects[1]).to.equal('weather');
    })
    .end(done);
  });

  it('put without subjectQuery (error)', (done) => {
    const toPut = {
      name: 'refocus-ok-generator',
      description: 'Collect status data',
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
      aspects: ['Temperature', 'Weather'],
    };

    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect((res) => {
      expect(res.body.errors[0].type).to.equal('SequelizeValidationError');
      expect(res.body.errors[0].message).to.equal(
        'Generator.subjectQuery cannot be null'
      );
    })
    .end(done);
  });

  it('put without generatorTemplate (error)', (done) => {
    const toPut = {
      name: 'refocus-ok-generator',
      description: 'Collect status data',
      tags: [
        'status',
        'STATUS',
      ],
      context: {
        okValue: {
          required: false,
          default: '0',
          description: 'An ok sample\'s value, e.g. \'0\'',
        },
      },
      subjectQuery: '?absolutePath=Foo.*',
      aspects: ['Temperature', 'Weather'],
    };

    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect((res) => {
      expect(res.body.errors[0].type).to.equal('SCHEMA_VALIDATION_FAILED');
      expect(res.body.errors[0].message).to.equal(
        'Missing required property: generatorTemplate'
      );
    })
    .end(done);
  });

  it('put without generatorTemplate name (error)', (done) => {
    const toPut = {
      name: 'refocus-ok-generator',
      description: 'Collect status data',
      tags: [
        'status',
        'STATUS',
      ],
      generatorTemplate: {
        version: generatorTemplate.version,
      },
      context: {
        okValue: {
          required: false,
          default: '0',
          description: 'An ok sample\'s value, e.g. \'0\'',
        },
      },
      subjectQuery: '?absolutePath=Foo.*',
      aspects: ['Temperature', 'Weather'],
    };

    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect((res) => {
      expect(res.body.errors[0].type).to.equal('SequelizeValidationError');
      expect(res.body.errors[0].message).to.equal(
        'child "name" fails because ["name" is required]'
      );
    })
    .end(done);
  });

  it('put with generatorTemplate name Validation fail (error)', (done) => {
    const toPut = {
      name: 'refocus-ok-generator',
      description: 'Collect status data',
      tags: [
        'status',
        'STATUS',
      ],
      generatorTemplate: {
        name: 123,
        version: generatorTemplate.version,
      },
      context: {
        okValue: {
          required: false,
          default: '0',
          description: 'An ok sample\'s value, e.g. \'0\'',
        },
      },
      subjectQuery: '?absolutePath=Foo.*',
      aspects: ['Temperature', 'Weather'],
    };

    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect((res) => {
      expect(res.body.errors[0].type).to.equal('SCHEMA_VALIDATION_FAILED');
      expect(res.body.errors[0].message).to.equal(
        'Expected type string but found type integer'
      );
    })
    .end(done);
  });

  it('put with generatorTemplate version Validation fail (error)', (done) => {
    const toPut = {
      name: 'refocus-ok-generator',
      description: 'Collect status data',
      tags: [
        'status',
        'STATUS',
      ],
      generatorTemplate: {
        name: generatorTemplate.name,
        version: 123,
      },
      context: {
        okValue: {
          required: false,
          default: '0',
          description: 'An ok sample\'s value, e.g. \'0\'',
        },
      },
      subjectQuery: '?absolutePath=Foo.*',
      aspects: ['Temperature', 'Weather'],
    };

    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect((res) => {
      expect(res.body.errors[0].type).to.equal('SCHEMA_VALIDATION_FAILED');
      expect(res.body.errors[0].message).to.equal(
        'Expected type string but found type integer'
      );
    })
    .end(done);
  });

  it('simple put with name in the url should work', (done) => {
    const toPut = {
      name: 'refocus-ok-generator',
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
      subjectQuery: '?absolutePath=Foo.*',
      aspects: ['Temperature', 'Weather'],
    };

    api.put(`${path}/${toPut.name}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.description).to.equal(toPut.description);
    })
    .end(done);
  });

  it('put without the required field: aspects', (done) => {
    const toPut = {
      name: 'refocus-ok-generator',
      description: 'Collect status data',
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
      subjectQuery: '?absolutePath=Foo.*',
    };

    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (!err) {
        return done('Expecting "Schema Validation Failed" error');
      }

      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray.length).to.equal(1);
      expect(errorArray[ZERO].type).to.equal('SCHEMA_VALIDATION_FAILED');
      done();
    });
  });

  it('error, put with currentCollector, read only', (done) => {
    const toPut = {
      name: 'refocus-ok-generator',
      description: 'Collect status data',
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
      subjectQuery: '?absolutePath=Foo.*',
      aspects: ['Temperature', 'Weather'],
      currentCollector: 'some-collector',
    };

    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('ValidationError');
      expect(res.body.errors[0].description).to.equal(
        'You cannot modify the read-only field: currentCollector'
      );
      return done();
    });
  });
});
