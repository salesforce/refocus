/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/createPerspective.js
 */
import { expect } from 'chai';
import React from 'react';
import sinon from 'sinon';
import CreatePerspective from '../../../view/perspective/CreatePerspective';
import { mount } from 'enzyme';

describe('tests/view/components/createPerspective.js, Perspective view >',
() => {
  const ZERO = 0;
  const ONE = 1;
  const TWO = 2;
  const EMPTY_STR = '';
  const DUMMY_STRING = 'COOL';
  const DUMMY_ID = '743bcf42-cd79-46d0-8c0f-d43adbb63866';
  const DUMMY_FUNCTION = () => {};
  const ONE_SUBJECT = {
    absolutePath: DUMMY_STRING,
    isPublished: true,
  };
  const DUMMY_ARRAY = 'qwertyui'.split('');
  const { getDropdownStyle } = CreatePerspective;
  const LENS = {
    id: DUMMY_ID,
    name: DUMMY_STRING,
    isPublished: true,
  };
  const PERS_NAME = DUMMY_STRING;

  /**
   * Sets up the component with dummy prop values.
   * @param {Object} valuesAddons Optional object specifying
   * overrides to the default props
   * @param {Object} stateAddons Optional object specifying
   * overrides to the default props
   * @returns {Object} The rendered component
   */
  function setup(valuesAddons, otherPropsObj) {
    const PERSPECTIVE_OBJECT = {
      name: PERS_NAME,
      lens: LENS,
      rootSubject: DUMMY_STRING,
      aspectFilterType: "EXCLUDE",
      aspectFilter: [ ],
      aspectTagFilterType: "EXCLUDE",
      aspectTagFilter: [ ],
      subjectTagFilterType: "EXCLUDE",
      subjectTagFilter: [ ], // empty for testing
      statusFilterType: "EXCLUDE",
      statusFilter: DUMMY_ARRAY, // not empty for testing
    };
    // simulate loading config
    const defaultProps = {
      name: PERS_NAME,
      params: {},
      cancelCreate: DUMMY_FUNCTION,
      isEditing: false,
      sendResource: spy,
      // options or all possible values
      values: {
        perspectives: [PERSPECTIVE_OBJECT],
        subjects: [], // { name: absolutePath, id }
        aspectTagFilter: [], // { name, id }
        aspectFilter: [], // strings
        subjectTagFilter: [], // strings
        lenses: [LENS], // { name, id }
        statusFilter: [],
        persNames: DUMMY_ARRAY, //strings
        rootSubject: {},
        lens: {}, // includes library
        // actual values
        perspective: PERSPECTIVE_OBJECT,
      },
    };
    // update defaultProps as needed
    if (valuesAddons) {
      Object.assign(defaultProps.values, valuesAddons);
    }
    if (otherPropsObj) {
      Object.assign(defaultProps, otherPropsObj)
    }

    // use monut to test all lifecycle methods, and children
    const enzymeWrapper = mount(<CreatePerspective {...defaultProps} />);
    return enzymeWrapper;
  }

  let stub;
  let spy;
  beforeEach(() => {
    stub = sinon.stub(CreatePerspective, 'findCommonAncestor');
    spy = sinon.spy();
  });
  afterEach(() => {
    CreatePerspective.findCommonAncestor.restore();
  });

  describe('after setting props isEditing to true >', () => {
    it('sendResource first argument is PUT', () => {
      const enzymeWrapper = setup(null, { isEditing: true });
      const instance = enzymeWrapper.instance();
      instance.doCreate();
      expect(spy.calledOnce).to.be.true;
      // expect method to be PUT
      expect(spy.args[0][0]).to.equal('PUT');
    });

    it('sendResource form object argument has field url defined, ' +
      'does not end with perspectives', () => {
      const enzymeWrapper = setup(null, { isEditing: true });
      const instance = enzymeWrapper.instance();
      instance.doCreate();
      expect(spy.calledOnce).to.be.true;
      const formObj = spy.args[0][1];
      expect(formObj).to.to.be.an('object');
      expect(formObj.url).to.be.defined;
      // expect url to end with perspective name
      expect(formObj.url.split('/').pop()).to.equal(DUMMY_STRING);
    });
  });

  describe('on create >', () => {
    it('dropdown options still contains all the lenses,' +
      ' even though state lens is empty', () => {
      // be default, not editing
      const enzymeWrapper = setup({});
      const instance = enzymeWrapper.instance();
      expect(instance.state.lenses).to.equal(EMPTY_STR);
      // the lens dropdown is not empty
      expect(instance.state.dropdownConfig.lenses.options.length).to.equal(ONE);
    });

    it('empty lens means state lens is also empty', () => {
      // add onto default
      const values = {
        // actual values
        lenses: [],
      };
      const enzymeWrapper = setup(values);
      const instance = enzymeWrapper.instance();
      // the current lens is empty
      expect(instance.state.lenses).to.equal(EMPTY_STR);
    });

    it('empty array means state array is also empty', () => {
      const values = {
        aspectTagFilter: [],
      };
      const enzymeWrapper = setup(values);
      const instance = enzymeWrapper.instance();
      expect(instance.state.aspectTagFilter).to.deep.equal([]);
    });
  });

  describe('on initial render >', () => {
    it('on Create, output name is empty', () => {
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      const INPUT = enzymeWrapper.find('input[name="name"]');
      expect(INPUT.getNode().value).to.equal(EMPTY_STR);
    });

    it('on edit, perspective name is not empty');

    it('props maps to state', () => {
      const enzymeWrapper = setup({}, { isEditing: true });
      const instance = enzymeWrapper.instance();
      expect(instance.state.statusFilter).to.deep.equal(DUMMY_ARRAY);
    });

    it('initial props isEditing is false', () => {
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      expect(instance.props.isEditing).to.be.false;
    });

    it('on edit, subject options are not empty', () => {
      const enzymeWrapper = setup({}, { isEditing: true });
      const instance = enzymeWrapper.instance();
      expect(instance.state.subjects).to.equal(DUMMY_STRING);
      // one value, no leftover options
      expect(instance.state.dropdownConfig.subjects.options.length).to.equal(ZERO);
    });
  });

  it('given the proper url parameter and resource, ' +
    ' create modal is shown with proper resource name', () => {
    const enzymeWrapper = setup();
    expect(enzymeWrapper.find('.slds-modal__container')).to.have.length(ONE);
    expect(enzymeWrapper.find('.slds-text-heading--medium').text())
      .to.equal('New Perspective');
  });

  it('on state change, perspective name is perserved', () => {
    const enzymeWrapper = setup();
    const instance = enzymeWrapper.instance();

    instance.onInputValueChange({
      name: 'perspectiveName',
      value: DUMMY_STRING,
    });
    expect(instance.state.perspectiveName).to.equal(DUMMY_STRING);
    // this changes state
    instance.showError(DUMMY_STRING);
    expect(instance.state.perspectiveName).to.equal(DUMMY_STRING);
  });

  it('on name change, state is updated with new perspective name', () => {
    const enzymeWrapper = setup();
    const instance = enzymeWrapper.instance();

    instance.onInputValueChange({
      name: 'perspectiveName',
      value: DUMMY_STRING,
    });
    expect(instance.state.perspectiveName).to.equal(DUMMY_STRING);
  });

  describe('for string inputs >', () => {
    it('by default, margin top of each dropdown is 0', () => {
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      const config = instance.state.dropdownConfig;
      for (let key in config) {
        const styleObj = getDropdownStyle(instance.state, key);
        expect(styleObj.hasOwnProperty('marginTop')).to.be.true;
        if (!config[key].isArray) {
          expect(styleObj.marginTop).to.equal(ZERO);
        }
      }
    });

    it('appending dropdown option does not change dropdown style', () => {
      stub.returns({ title: 'subjects' });
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      // before selecting a pill
      expect(getDropdownStyle(instance.state, 'subjects').marginTop)
        .to.equal(ZERO);
      instance.appendPill({
        target: {
          textContent: DUMMY_STRING,
        },
      });
      // after selecting a pill
      expect(getDropdownStyle(instance.state, 'subjects').marginTop)
        .to.equal(ZERO);
    });

    it('appending dropdown option updates state to input string', () => {
      stub.returns({ title: 'subjects' });
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      instance.appendPill({
        target: {
          textContent: DUMMY_STRING,
        },
      });
      expect(instance.state.subjects).to.deep.equal(DUMMY_STRING);
    });

    it('isArray property on config is false', () => {
      const enzymeWrapper = setup({ subjects: [ONE_SUBJECT] });
      const instance = enzymeWrapper.instance();
      expect(instance.state.dropdownConfig.subjects.isArray).to.be.false;
    });

    it('on add pill, the old value gets added back to options', () => {
      const enzymeWrapper = setup();
      const RESOURCE_NAME = 'subjects';
      const instance = enzymeWrapper.instance();
      // set current value to ONE_SUBJECT.absolutePath
      instance.setState({ subjects: DUMMY_STRING });
      expect(instance.state[RESOURCE_NAME]).to.equal(DUMMY_STRING);

      const EXPECTED_STR = DUMMY_STRING + DUMMY_STRING;
      const OBJ = {
        textContent: EXPECTED_STR,
      };
      stub.withArgs(OBJ, 'slds-pill').returns({
        getElementsByClassName: () => RESOURCE_NAME
      });
      // for fieldElem
      stub.withArgs(OBJ, 'slds-form-element__control')
        .returns({ title: RESOURCE_NAME });
      // replace pill
      instance.appendPill({
        target: OBJ,
      });
      expect(instance.state[RESOURCE_NAME]).to.equal(EXPECTED_STR);
      // replaced pill value should have been added back to options
      expect(instance.state.dropdownConfig[RESOURCE_NAME].options)
        .to.contain(DUMMY_STRING);
    });

    it('on remove pill, state is updated for single pill input', () => {
      const enzymeWrapper = setup();
      const RESOURCE_NAME = 'subjects';
      const instance = enzymeWrapper.instance();
      instance.setState({ subjects: [ONE_SUBJECT] });
      const OBJ = {
        textContent: DUMMY_STRING,
      };
      // for pillElem
      stub.withArgs(OBJ, 'slds-pill').returns({
        getElementsByClassName: () => 'subjects'
      });
      // for fieldElem
      stub.withArgs(OBJ, 'slds-form-element__control')
        .returns({ title: 'subjects' });

      instance.deletePill({
        target: OBJ,
      });
      expect(instance.state[RESOURCE_NAME]).to.equal('');
    });

    it('on remove pill, dropdown style does not change', () => {
      const enzymeWrapper = setup();
      const RESOURCE_NAME = 'subjects';
      const instance = enzymeWrapper.instance();
      instance.setState({ subjects: [ONE_SUBJECT] });
      const OBJ = {
        textContent: DUMMY_STRING,
      };
      // for pillElem
      stub.withArgs(OBJ, 'slds-pill').returns({
        getElementsByClassName: () => 'subjects'
      });
      // for fieldElem
      stub.withArgs(OBJ, 'slds-form-element__control')
        .returns({ title: 'subjects' });

      instance.deletePill({
        target: OBJ,
      });
      expect(getDropdownStyle(instance.state, RESOURCE_NAME).marginTop)
        .to.equal(ZERO);
    });
  });

  describe('for array inputs >', () => {
    it('onclck remove pill, margin top is re-adjusted', () => {
      const RESOURCE_NAME = 'aspectTagFilter';
      const enzymeWrapper = setup({
        RESOURCE_NAME
      });
      const instance = enzymeWrapper.instance();
      const OBJ = {
        textContent: DUMMY_STRING,
      };
      // for pillElem
      stub.withArgs(OBJ, 'slds-pill').returns({
        getElementsByClassName: () => RESOURCE_NAME
      });
      // for fieldElem
      stub.withArgs(OBJ, 'slds-form-element__control')
        .returns({ title: RESOURCE_NAME });

      instance.appendPill({
        target: {
          textContent: OBJ.textContent
        },
      });
      instance.deletePill({
        target: OBJ,
      });
      expect(getDropdownStyle(instance.state, RESOURCE_NAME).marginTop)
        .to.equal(ZERO);
    });

    it('onclck remove pill, the removed option is added ' +
      'back into the dropdown', () => {
      const RESOURCE_NAME = 'aspectTagFilter';
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      const OBJ = {
        textContent: DUMMY_STRING,
      };
      // for pillElem
      stub.withArgs(OBJ, 'slds-pill').returns({
        // return an array of element Object. object has a textContent
        // this is the elem to remove
        getElementsByClassName: () => [{ textContent: DUMMY_STRING }],
      });
      // for fieldElem
      stub.withArgs(OBJ, 'slds-form-element__control')
        .returns({ title: RESOURCE_NAME });
      instance.deletePill({
        target: OBJ,
      });
      expect(instance.state.dropdownConfig[RESOURCE_NAME].options)
        .to.contain(DUMMY_STRING);
    });

    it('on non-empty value, input box is still rendered');

    it('by default, margin top of each dropdown is 0', () => {
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      const config = instance.state.dropdownConfig;
      const key = 'subjectTagFilter';
      const styleObj = getDropdownStyle(instance.state, key);
      expect(styleObj.hasOwnProperty('marginTop')).to.be.true;
      // check margin top of empty values
      expect(styleObj.marginTop).to.equal(ZERO);
    });

    it('on pill removal, margin top moves up', () => {
      const RESOURCE_NAME = 'aspectTagFilter';
      const setupObj = {};
      const enzymeWrapper = setup(setupObj[RESOURCE_NAME]: DUMMY_ARRAY);
      const instance = enzymeWrapper.instance();
      const OBJ = {
        textContent: DUMMY_STRING,
      };
      // for pillElem
      stub.withArgs(OBJ, 'slds-pill').returns({
        getElementsByClassName: () => RESOURCE_NAME
      });
      // for fieldElem
      stub.withArgs(OBJ, 'slds-form-element__control')
        .returns({ title: RESOURCE_NAME });

      instance.deletePill({
        target: OBJ,
      });
      expect(getDropdownStyle(instance.state, RESOURCE_NAME).marginTop)
        .to.equal(-instance.props.BLOCK_SIZE);
    });

    it('isArray property is true', () => {
      const enzymeWrapper = setup({
        aspectTagFilter: 'qwewretrytuyi'.split(''),
      });
      const instance = enzymeWrapper.instance();
      expect(instance.state.dropdownConfig.aspectTagFilter.isArray).to.be.true;
    });

    it('appending pills updates state to array of length one', () => {
      const RESOURCE_NAME = 'aspectTagFilter';
      stub.returns({ title: RESOURCE_NAME });
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      // before selecting a pill
      expect(getDropdownStyle(instance.state, RESOURCE_NAME).marginTop)
        .to.equal(ZERO);
      instance.appendPill({
        target: {
          textContent: DUMMY_STRING + ONE,
        },
      });
      expect(Array.isArray(instance.state[RESOURCE_NAME])).to.be.true;
      expect(instance.state[RESOURCE_NAME].length).to.equal(ONE);
    });

    it('appending multiple pills updates state to have multiple pills', () => {
      const RESOURCE_NAME = 'subjectTagFilter';
      stub.returns({ title: RESOURCE_NAME });
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      instance.appendPill({
        target: {
          textContent: DUMMY_STRING + ONE,
        },
      });
      instance.appendPill({
        target: {
          textContent: DUMMY_STRING + TWO,
        },
      });
      expect(Array.isArray(instance.state[RESOURCE_NAME])).to.be.true;
      expect(instance.state[RESOURCE_NAME].length).to.equal(TWO);
    });

    it('on add one pill, dropdown style moves down to accomodate pill', () => {
      const RESOURCE_NAME = 'statusFilter';
      stub.returns({ title: RESOURCE_NAME });
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      instance.appendPill({
        target: {
          textContent: DUMMY_STRING + ONE,
        },
      });
      expect(getDropdownStyle(instance.state, RESOURCE_NAME).marginTop)
        .to.be.above(ZERO);
    });

    it('on add two pills, dropdown style moves down to accomodate pill', () => {
      const RESOURCE_NAME = 'subjectTagFilter';
      stub.returns({ title: RESOURCE_NAME });
      const enzymeWrapper = setup();
      const instance = enzymeWrapper.instance();
      instance.appendPill({
        target: {
          textContent: DUMMY_STRING + ONE,
        },
      });
      instance.appendPill({
        target: {
          textContent: DUMMY_STRING + TWO,
        },
      });
      expect(getDropdownStyle(instance.state, RESOURCE_NAME).marginTop)
        .to.equal(instance.props.BLOCK_SIZE * TWO); // since there's two pills
    });
  });
});
