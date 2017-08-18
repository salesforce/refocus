/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/utils/processForm.js
 *
 * Tests the functions in getFormData.js
 */

import { expect } from 'chai';
import { checkValidation } from '../../../view/admin/utils/getFormData.js';

describe('tests/view/utils/processForm.js, Process form >', () => {
  const CONTAIN_SPACES = 'contain spaces';
  const ACCEPTABLE = 'accept_this_with_numbers999';

  it('on invalid field, validator returns all values' +
    ' of the invalid field, including valid values', () => {
    const propertyMetadata = [
      {
        propertyName: 'tags',
        displayName: 'tags',
        validate: /^[0-9A-Za-z_\\-]{1,60}$/
      },
    ];
    const MIXED_OBJ = { tags:
      [CONTAIN_SPACES, ACCEPTABLE]
    };
    const result = checkValidation(propertyMetadata, MIXED_OBJ);
    expect(result).to.deep.equal(MIXED_OBJ);
  });

  it('validator fails array with string containing spaces', () => {
    const propertyMetadata = [
      {
        propertyName: 'tags',
        displayName: 'tags',
        validate: /^[0-9A-Za-z_\\-]{1,60}$/
      },
    ];
    const keys = Object.keys(
      checkValidation(propertyMetadata, { tags: [CONTAIN_SPACES] })
    );
    expect(keys).to.deep.equal(['tags']);
  });

  it('validator passes valid array', () => {
    const propertyMetadata = [
      {
        propertyName: 'tags',
        displayName: 'tags',
        validate: /^[0-9A-Za-z_\\-]{1,60}$/
      },
    ];
    const result = checkValidation(
      propertyMetadata,
      { tags: [ACCEPTABLE] },
    );
    expect(result).to.deep.equal({});
  });

  it('validator passes valid string', () => {
    const propertyMetadata = [
      {
        propertyName: 'name',
        displayName: 'name',
        validate: /^[0-9A-Za-z_\\-]{1,60}$/
      },
    ];
    const result = checkValidation(
      propertyMetadata,
      { name: ACCEPTABLE },
    );
    expect(result).to.deep.equal({});
  });

  it('validator fails invalid string', () => {
    const propertyMetadata = [
      {
        propertyName: 'name',
        displayName: 'name',
        validate: /^[0-9A-Za-z_\\-]{1,60}$/
      },
    ];
    const keys = Object.keys(
      checkValidation(
        propertyMetadata,
        { name: CONTAIN_SPACES }
      )
    );
    expect(keys).to.deep.equal(['name']);
  });

  it('getFormData returns updated value, after input value change');

  it('getFormData returns expected JSON representation given ' +
    'form with radio buttons');

  it('getFormData returns expected JSON representation given ' +
    'form with inputs whose names include _');

  it('getFormData returns expected JSON representation given ' +
    'form with percent values in input text');
});
