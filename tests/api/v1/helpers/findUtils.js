/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/helpers/findUtils.js
 */
'use strict'; // eslint-disable-line strict
const fu = require('../../../../api/v1/helpers/verbs/findUtils.js');
const config = require('../../../../config');
const Op = require('sequelize').Op;
const options = fu.options;
const expect = require('chai').expect;

describe('tests/api/v1/helpers/findUtils.js', () => {
  describe('build options object >', () => {
    let props;
    let params;

    beforeEach((done) => {
      props = { tagFilterName: 'tags' };
      params = {
        fields: {},
        sort: {},
        limit: {},
        offset: {},
        name: {},
        description: {},
        tags: {},
      };
      done();
    });

    it('no values', () => {
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: {},
      };

      expect(options(params, props)).to.deep.equal(opts);
    });

    it('basic values', () => {
      params.fields.value = ['name', 'description'];
      params.sort.value = 'name';
      params.limit.value = '10';
      params.offset.value = '10';
      params.name.value = 'name1';
      params.description.value = 'desc1';

      const opts = {
        attributes: ['name', 'description', 'id'],
        order: ['name'],
        limit: 1, // limit set to 1 because name is unique
        offset: 10,
        where: {
          name: {
            [Op.iLike]: 'name1',
          },
          description: {
            [Op.iLike]: 'desc1',
          },
        },
      };

      expect(options(params, props)).to.deep.equal(opts);
    });

    it('replace/escape like clause', () => {
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: {
          name: {
            [Op.iLike]: '%name%',
          },
        },
      };

      params.name.value = '*name*';
      opts.where.name.$iLike = '%name%';
      expect(options(params, props)).to.deep.equal(opts);

      params.name.value = 'na%me';
      opts.where.name.$iLike = 'na\\%me';
      expect(options(params, props)).to.deep.equal(opts);

      // limit set to 1 because name is unique
      const optsWithLimit1 = Object.assign({}, opts);
      optsWithLimit1.limit = 1;
      params.name.value = 'na_me';
      opts.where.name.$iLike = 'na\\_me';
      expect(options(params, props)).to.deep.equal(optsWithLimit1);

      params.name.value = '*n%am_e*';
      opts.where.name.$iLike = '%n\\%am\\_e%';
      expect(options(params, props)).to.deep.equal(opts);
    });

    it('toSequelizeWildcards', (done) => {
      expect(fu.toSequelizeWildcards('abc')).to.be.equal('abc');
      expect(fu.toSequelizeWildcards('*abc')).to.be.equal('%abc');
      expect(fu.toSequelizeWildcards('abc*')).to.be.equal('abc%');
      expect(fu.toSequelizeWildcards('*a*b*c*')).to.be.equal('%a%b%c%');
      expect(fu.toSequelizeWildcards('***a')).to.be.equal('%%%a');
      done();
    });

    it('tags single include', () => {
      params.tags.value = ['a'];
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: { tags: { [Op.contains]: ['a'] } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });

    it('tags multiple include', () => {
      params.tags.value = ['a', 'b'];
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: { tags: { [Op.contains]: ['a', 'b'] } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });

    it('tags single exclude', () => {
      params.tags.value = ['-a'];
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: { [Op.not]: { tags: { [Op.overlap]: ['a'] } } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });

    it('tags multiple exclude', () => {
      params.tags.value = ['-a', 'b'];
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: { [Op.not]: { tags: { [Op.overlap]: ['a', 'b'] } } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });

    it('tags multiple exclude', () => {
      params.tags.value = ['-a', '-b'];
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: { [Op.not]: { tags: { [Op.overlap]: ['a', 'b'] } } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });
  });

  describe('applyLimitIfUniqueField >', () => {
    it('basic opts with no unique field, limit unchanged', () => {
      const props = {};
      const opts = {
        limit: config.api.defaults.limit,
        where: { someField: { [Op.iLike]: 'someValue' } },
      };

      fu.applyLimitIfUniqueField(opts, props);
      expect(opts).to.deep.equal({
        limit: config.api.defaults.limit,
        where: { someField: { [Op.iLike]: 'someValue' } },
      });
    });

    it('opts with name field, one value, limit set to 1', () => {
      const props = {};
      const opts = {
        limit: 15000,
        where: { name: { [Op.iLike]: 'someName' } },
      };

      fu.applyLimitIfUniqueField(opts, props);
      expect(opts).to.deep.equal({
        limit: 1,
        where: { name: { [Op.iLike]: 'someName' } },
      });
    });

    it('opts with name field, multiple value, limit set to number of ' +
      'values', () => {
      const props = {};
      const opts = {
        limit: 40,
        where: { name:
          { [Op.or]: [{ [Op.iLike]: 'someName1' }, { [Op.iLike]: 'someName2' }] },
        },
      };

      fu.applyLimitIfUniqueField(opts, props);
      expect(opts).to.deep.equal({
        limit: 2,
        where: { name:
          { [Op.or]: [{ [Op.iLike]: 'someName1' }, { [Op.iLike]: 'someName2' }] },
        },
      });
    });

    it('opts with overriden unique field, one value, limit set to 1', () => {
      const props = { nameFinder: 'absolutePath' };
      const opts = {
        limit: 50,
        where: { absolutePath: { [Op.iLike]: 'someName' } },
      };

      fu.applyLimitIfUniqueField(opts, props);
      expect(opts).to.deep.equal({
        limit: 1,
        where: { absolutePath: { [Op.iLike]: 'someName' } },
      });
    });

    it('opts with overriden unique field, multiple value, limit set to ' +
      'number of values', () => {
      const props = { nameFinder: 'absolutePath' };
      const opts = {
        limit: 5,
        where: { absolutePath:
          { [Op.or]: [{ [Op.iLike]: 'someName1' }, { [Op.iLike]: 'someName2' }] },
        },
      };

      fu.applyLimitIfUniqueField(opts, props);
      expect(opts).to.deep.equal({
        limit: 2,
        where: { absolutePath:
          { [Op.or]: [{ [Op.iLike]: 'someName1' }, { [Op.iLike]: 'someName2' }] },
        },
      });
    });

    it('opts with name field, one wildcard value, limit unchanged', () => {
      const props = {};
      const opts = {
        limit: 20,
        where: { name: { [Op.iLike]: 'someName%' } },
      };

      fu.applyLimitIfUniqueField(opts, props);
      expect(opts).to.deep.equal({
        limit: 20,
        where: { name: { [Op.iLike]: 'someName%' } },
      });
    });

    it('opts with name field, multiple value, one wildcard value, ' +
      'limit unchanged', () => {
      const props = {};
      const opts = {
        limit: 10,
        where: { name:
          { [Op.or]: [{ [Op.iLike]: 'someName1' }, { [Op.iLike]: 'some%Name' }] },
        },
      };

      fu.applyLimitIfUniqueField(opts, props);
      expect(opts).to.deep.equal({
        limit: 10,
        where: { name:
          { [Op.or]: [{ [Op.iLike]: 'someName1' }, { [Op.iLike]: 'some%Name' }] },
        },
      });
    });
  });
});
