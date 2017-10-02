/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generatortemplate/classMethods.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const GeneratorTemplate = tu.db.GeneratorTemplate;

describe('tests/db/model/generatortemplate/classMethods.js >', () => {
  const gt = u.getGeneratorTemplate();

  after(u.forceDelete);

  describe('getAssociation >', () => {
    it('should return all the associations', (done) => {
      const associations = GeneratorTemplate.getGeneratortemplateAssociations();
      expect(associations).to.all.keys('writers', 'user');
      done();
    });
  });

  describe('getSemverMatches >', () => {
    it('no match', (done) => {
      const gt = u.getGeneratorTemplate();
      gt.version = '6.0.0';
      gt.name += '6';
      const gt1 = JSON.parse(JSON.stringify(gt));
      gt1.version = '6.0.1';
      const gt2 = JSON.parse(JSON.stringify(gt));
      gt2.version = '6.1.1';
      const gt3 = JSON.parse(JSON.stringify(gt));
      gt3.version = '6.9.0';

      GeneratorTemplate.bulkCreate([gt, gt1, gt2, gt3])
      .then(() => GeneratorTemplate.getSemverMatches('NO_MATCH', '^6.0.0'))
      .then((arr) => {
        if (!Array.isArray(arr) || arr.length > 0) {
          throw new Error('Expecting a zero-length array of GeneratorTemplate ' +
            'objects');
        }
      })
      .then(() => done())
      .catch(done);
    });

    it('one match', (done) => {
      const gt = u.getGeneratorTemplate();
      gt.version = '6.0.0';
      gt.name += 'ONE_MATCH';
      const gt1 = JSON.parse(JSON.stringify(gt));
      gt1.version = '6.0.1';
      const gt2 = JSON.parse(JSON.stringify(gt));
      gt2.version = '6.1.1';
      const gt3 = JSON.parse(JSON.stringify(gt));
      gt3.version = '6.9.0';

      GeneratorTemplate.bulkCreate([gt, gt1, gt2, gt3])
      .then(() => GeneratorTemplate.getSemverMatches(gt.name, '^6.8.0'))
      .then((arr) => {
        expect(arr).to.have.lengthOf(1);
        expect(arr[0]).to.have.property('version', '6.9.0');
      })
      .then(() => done())
      .catch(done);
    });

    it('multiple matches', (done) => {
      const gt = u.getGeneratorTemplate();
      gt.version = '6.0.0';
      gt.name += 'MANY_MATCHES';
      const gt1 = JSON.parse(JSON.stringify(gt));
      gt1.version = '6.0.1';
      const gt2 = JSON.parse(JSON.stringify(gt));
      gt2.version = '6.1.1';
      const gt3 = JSON.parse(JSON.stringify(gt));
      gt3.version = '6.9.0';

      GeneratorTemplate.bulkCreate([gt, gt1, gt2, gt3])
      .then(() => GeneratorTemplate.getSemverMatches(gt.name, '^6.1.0'))
      .then((arr) => {
        expect(arr).to.have.lengthOf(2);
      })
      .then(() => done())
      .catch(done);
    });
  });

  describe('getSemverMatch >', () => {
    it('exact version match when GT version = 1.0.0 and test ' +
      'version = 1.0.0', (done) => {
      let createdGT;
      gt.version = '1.0.0';
      gt.name += '1';
      GeneratorTemplate.create(gt)
      .then((o) => {
        createdGT = o;
        return GeneratorTemplate.getSemverMatch(gt.name, '1.0.0');
      })
      .then((o) => {
        if (!o) {
          return done('Expecting a GeneratorTemplate object');
        }

        expect(o.dataValues.version).to.equal(createdGT.dataValues.version);
        return done();
      })
      .catch(done);
    });

    it('match version when GT version = 2.0.0 and test ' +
      'verison = ^2.0.0', (done) => {
      let createdGT;
      gt.version = '2.0.0';
      gt.name += '2';
      GeneratorTemplate.create(gt)
      .then((o) => {
        createdGT = o;
        return GeneratorTemplate.getSemverMatch(gt.name, '^2.0.0');
      })
      .then((o) => {
        if (!o) {
          return done('Expecting a GeneratorTemplate object');
        }

        expect(o.dataValues.version).to.equal(createdGT.dataValues.version);
        return done();
      })
      .catch(done);
    });

    it('match version when GT version = 3.0.0 and test ' +
      'verison is <=3.0.0', (done) => {
      let createdGT;
      gt.version = '3.0.0';
      gt.name += '3';
      GeneratorTemplate.create(gt)
      .then((o) => {
        createdGT = o;
        return GeneratorTemplate.getSemverMatch(gt.name, '<=3.0.0');
      })
      .then((o) => {
        if (!o) {
          return done('Expecting a GeneratorTemplate object');
        }

        expect(o.dataValues.version).to.equal(createdGT.dataValues.version);
        return done();
      })
      .catch(done);
    });

    it('no match when GT version = 5.0.0 and test ' +
      'verison is <=4.0.0', (done) => {
      gt.version = '5.0.0';
      gt.name += '5';
      GeneratorTemplate.create(gt)
      .then(() => GeneratorTemplate
        .getSemverMatch(gt.name, '<=4.0.0'))
      .then((o) => {
        if (!o) {
          return done();
        }

        return done('Expecting no sample generatorTemplate to be returned');
      })
      .catch(done);
    });

    it('no match when GT version = 4.0.0 and test ' +
      'verison is >4.0.0', (done) => {
      gt.version = '4.0.0';
      gt.name += '4';
      GeneratorTemplate.create(gt)
      .then(() => GeneratorTemplate.getSemverMatch(gt.name, '>4.0.0'))
      .then((o) => {
        if (!o) {
          return done();
        }

        return done('Expecting no sample generatorTemplate to be returned');
      })
      .catch(done);
    });

    it('no match when GT matching the name is not found', (done) => {
      const gtName = 'removeRandomSGTName';
      GeneratorTemplate.getSemverMatch(gtName, '1.0.0')
      .then((o) => {
        if (!o) {
          return done();
        }

        return done('Expecting no sample generatorTemplate to be returned');
      })
      .catch(done);
    });

    it('should return the right GT version matching the ^ or >= or <= ' +
      'schemantics', (done) => {
      gt.version = '6.0.0';
      gt.name += '6';
      const gt1 = JSON.parse(JSON.stringify(gt));
      gt1.version = '6.0.1';
      const gt2 = JSON.parse(JSON.stringify(gt));
      gt2.version = '6.1.1';
      const gt3 = JSON.parse(JSON.stringify(gt));
      gt3.version = '6.9.0';

      GeneratorTemplate.bulkCreate([gt, gt1, gt2, gt3])
      .then(() => GeneratorTemplate
        .getSemverMatch(gt.name, '^6.0.0'))
      .then((o) => {
        if (!o) {
          return done('Expecting a GeneratorTemplate object');
        }

        expect(o.dataValues.name).to.equal(gt3.name);
        expect(o.dataValues.version).to.equal(gt3.version);
        return GeneratorTemplate
        .getSemverMatch(gt.name, '>=6.0.0');
      })
      .then((o) => {
        expect(o.dataValues.name).to.equal(gt3.name);
        expect(o.dataValues.version).to.equal(gt3.version);
        return GeneratorTemplate
        .getSemverMatch(gt.name, '<6.0.1');
      })
      .then((o) => {
        expect(o.dataValues.name).to.equal(gt.name);
        expect(o.dataValues.version).to.equal(gt.version);
        return GeneratorTemplate
        .getSemverMatch(gt.name, '6.1.1');
      })
      .then((o) => {
        expect(o.dataValues.name).to.equal(gt2.name);
        expect(o.dataValues.version).to.equal(gt2.version);
        return done();
      })
      .catch(done);
    });
  });
});
