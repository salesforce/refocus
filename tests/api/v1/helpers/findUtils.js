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
'use strict';
const fu = require('../../../../api/v1/helpers/verbs/findUtils.js');
const config = require('../../../../config');
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
        limit: 10,
        offset: 10,
        where: {
          name: {
            $iLike: 'name1',
          },
          description: {
            $iLike: 'desc1',
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
            $iLike: '%name%',
          },
        },
      };

      params.name.value = '*name*';
      opts.where.name.$iLike = '%name%';
      expect(options(params, props)).to.deep.equal(opts);

      params.name.value = 'na%me';
      opts.where.name.$iLike = 'na\\%me';
      expect(options(params, props)).to.deep.equal(opts);

      params.name.value = 'na_me';
      opts.where.name.$iLike = 'na\\_me';
      expect(options(params, props)).to.deep.equal(opts);

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
        where: { tags: { $contains: ['a'] } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });

    it('tags multiple include', () => {
      params.tags.value = ['a', 'b'];
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: { tags: { $contains: ['a', 'b'] } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });

    it('tags single exclude', () => {
      params.tags.value = ['-a'];
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: { $not: { tags: { $overlap: ['a'] } } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });

    it('tags multiple exclude', () => {
      params.tags.value = ['-a', 'b'];
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: { $not: { tags: { $overlap: ['a', 'b'] } } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });

    it('tags multiple exclude', () => {
      params.tags.value = ['-a', '-b'];
      const opts = {
        limit: config.api.defaults.limit,
        offset: config.api.defaults.offset,
        where: { $not: { tags: { $overlap: ['a', 'b'] } } },
      };
      expect(options(params, props)).to.deep.equal(opts);
    });

  });
});
