/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/persController.js
 */

import { expect } from 'chai';
import React from 'react';
import sinon from 'sinon';
import PerspectiveController from '../../../view/perspective/PerspectiveController.js';
import { mount } from 'enzyme';

describe('Perspective controller ', () => {
  const ZERO = 0;
  const ONE = 1;
  const TWO = 2;
  const DUMMY_STRING = 'COOL';
  const DUMMY_ID = '743bcf42-cd79-46d0-8c0f-d43adbb63866';
  const DUMMY_FUNCTION = () => {};
  const ONE_SUBJECT = {
    absolutePath: DUMMY_STRING,
    isPublished: true,
  };
  const DUMMY_ARRAY = 'qwertyui'.split('');
  const LENS = {
    id: DUMMY_ID,
    name: DUMMY_STRING,
  };

  function setup() {
    const defaultProps = {
      params: {},
      values: {
        aspectFilter: [],
        aspectTags: [],
        lenses: [LENS],
      },
    }
    const enzymeWrapper = mount(<PerspectiveController {...defaultProps} />);
    return enzymeWrapper;
  }

  describe('on show create modal', () => {
    it('calling openCreatePanel sets state to true', () => {
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      instance.openCreatePanel();
      expect(instance.state.showCreatePanel).to.be.true;
    });
  });
});
