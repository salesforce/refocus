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
const filterArrFromArr = fu.filterArrFromArr;
const options = fu.options;
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;

describe('filter subject array with tags array', () => {
  it('filter returns some elements with INCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, 'a');
    expect(result).to.deep.equal([sArr[ZERO]]);
  });

  it('filter returns one element with INCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b', 'c'] }];
    const result = filterArrFromArr(sArr, 'b,c');
    expect(result).to.deep.equal([sArr[ONE]]);
  });

  it('filter returns no elements with multiple INCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, 'a,b');
    expect(result).to.deep.equal([]);
  });

  it('filter returns no elements with EXCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, '-a,-b');
    expect(result.length).to.equal(ZERO);
  });

  it('filter returns no elements with EXCLUDE, ' +
    'with leading -', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, '-a,b');
    expect(result.length).to.equal(ZERO);
  });

  it('filter returns some elements with EXCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, '-a');
    expect(result).to.deep.equal([sArr[ONE]]);
  });
});

describe('build options object: ', () => {
  let props;
  let params;

  beforeEach((done) => {
    props = {};
    params = {
      fields: {},
      sort: {},
      limit: {},
      offset: {},
      name: {},
      description: {}
    };
    done();
  });

  it('no values', () => {
    const opts = {
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
});
