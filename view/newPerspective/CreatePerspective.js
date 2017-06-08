/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/perspective/CreatePerspective.js
 *
 * Shows the perspective's details, and allow user inupt for edit.
 */
import React, { PropTypes } from 'react';
import Modal from '../admin/components/common/Modal';
import Pill from '../admin/components/common/Pill';
import Dropdown from '../admin/components/common/Dropdown';
import ControlledInput from '../admin/components/common/ControlledInput';
import ErrorRender from '../admin/components/common/ErrorRender';
import RadioGroup from '../admin/components/common/RadioGroup';
import { filteredArray, getConfig } from './utils';

const ZERO = 0;

/**
 * Returns the state object without any incidental data.
 * @param {Object} stateObject this component's state.
 * @returns {Object} The state with bare minimum data.
 */
function getStateDataOnly(stateObject) {
  // deep copy
  const stateCopy = JSON.parse(JSON.stringify(stateObject));
  delete stateCopy.dropdownConfig;
  delete stateCopy.error;
  return stateCopy;
}

class CreatePerspective extends React.Component {
  // separate props and status from value prop
  constructor(props) {
    super(props);
    this.appendPill = this.appendPill.bind(this);
    this.showError = this.showError.bind(this);
    this.deletePill = this.deletePill.bind(this);
    this.handleRadioButtonClick = this.handleRadioButtonClick.bind(this);
    this.updateDropdownConfig = this.updateDropdownConfig.bind(this);
    this.state = {
      dropdownConfig: {},
      error: '',
      name: props.name,
      subjects: [],
      lenses: '',
      statusFilterType: '',
      statusFilter: [],
      subjectTagFilter: [],
      subjectTagFilterType: '',
      aspectTagFilter: [],
      aspectTagFilterType: '',
      aspectFilter: [],
      aspectFilterType: '',
    }; // default values
  }

  /**
   * @param {DOM_element} el The element to find ancestor with selector from
   * @param {String} selector The selector of ancestor
   * @returns {DOM_element} The ancestor element that is closest to el
   */
  static findCommonAncestor(el, selector) {
    let retval = null;
    while (el) {
      if (el.classList.length && el.classList.contains(selector)) {
        retval = el;
        break;
      }

      el = el.parentNode;
    }

    return retval;
  }

  /**
   * Gets the style object, given a state
   * @param {object} state of an instance of this react element
   * @param {string} dropdownKey The key to the property in state
   * @returns {Object} the style object
   */
  static getDropdownStyle(state, dropdownKey) {
    return state.dropdownConfig ?
      state.dropdownConfig[dropdownKey].dropDownStyle : {};
  }

  componentDidMount() {
    const { values, name, isEditing } = this.props;

    /*
     * Possible cases:
     * on edit: load the perspective according to name.
     * on new: load the default object
     */
    let stateObject;

    // wait for props values to be assigned
    if (values) {
      if (isEditing) {
        const _perspective = values.perspectives
          .filter((pers) => pers.name === name)[0];
        stateObject = {
          name: _perspective.name,
          lenses: _perspective.lens.name,
          subjects: _perspective.rootSubject,
          statusFilterType: _perspective.statusFilterType,
          statusFilter: _perspective.statusFilter,
          subjectTagFilter: _perspective.subjectTagFilter,
          subjectTagFilterType: _perspective.subjectTagFilterType,
          aspectTagFilter: _perspective.aspectTagFilter,
          aspectTagFilterType: _perspective.aspectTagFilterType,
          aspectFilter: _perspective.aspectFilter,
          aspectFilterType: _perspective.aspectFilterType,
        };
      } else {
        // use default values
        stateObject = {
          name: '',
          lenses: '',
          subjects: '',
          statusFilterType: 'EXCLUDE',
          statusFilter: [],
          subjectTagFilter: [],
          subjectTagFilterType: 'EXCLUDE',
          aspectTagFilter: [],
          aspectTagFilterType: 'EXCLUDE',
          aspectFilter: [],
          aspectFilterType: 'EXCLUDE',
        }
      }

      this.setState(stateObject, () => {
        this.updateDropdownConfig();
      });
    }
  }

  updateDropdownConfig() {

    // attach config to keys, keys to dropdownConfig
    const { dropdownConfig } = this.state;
    const { values, BLOCK_SIZE } = this.props;
    let stateObject = getStateDataOnly(this.state);
    for (let key in stateObject) {
      let value = this.state[key];

      //  if perspective passed in, may amend value based on key
      let config = getConfig(values, key, value);

      // if this dropdown is multi-pill, move the dropdown menu lower
      let marginTop = !config.isArray ? ZERO : value.length * BLOCK_SIZE;
      config.dropDownStyle = { marginTop },
      config.onClickItem = this.appendPill,
      dropdownConfig[key] = config;
    }

    this.setState({ dropdownConfig });
  }

  handleRadioButtonClick(event) {
    const buttonGroup = this.constructor.findCommonAncestor(
      event.target,
      'slds-button-group',
    );

    const filterType = buttonGroup.title;
    const stateRule = {};
    stateRule[filterType] = event.target.textContent.toUpperCase();
    this.setState(stateRule);
  }

  showError(error) {
    let displayError = error;

    // if error message is from the API, parse it for content
    if (typeof error === 'object') {
      displayError = 'status code: ' +
        error.status + '. Error: ' +
        JSON.parse(error.response.text).errors[ZERO].message;
    }

    this.setState({ error: displayError });
  }

  closeError() {
    this.setState({ error: '' });
  }

  onInputValueChange(event) {
    const { name, value } = event;
    let stateRule = {};
    stateRule[name] = value;
    this.setState(stateRule);
  }

  deletePill(event) {
    const {
      findCommonAncestor,
      getDropdownStyle,
    } = this.constructor;
    const pillElem = findCommonAncestor(event.target, 'slds-pill');
    const labelContent = pillElem.getElementsByClassName('slds-pill__label')[ZERO]
      .textContent;
    const fieldElem = findCommonAncestor(event.target, 'slds-form-element__control');
    const dropdownTitle = fieldElem.title;
    const valueInState = this.state[dropdownTitle];

    // copy config into new object
    let newState = { dropdownConfig: this.state.dropdownConfig };

    // pills
    if (newState.dropdownConfig[dropdownTitle].isArray) {
      const styleObj = getDropdownStyle(newState, dropdownTitle);
      if (valueInState) {

        // remove pill from array of pills
        newState[dropdownTitle] = filteredArray(valueInState, labelContent);
        styleObj.marginTop -= this.props.BLOCK_SIZE;
      } else {

        // no pill, set default marginTop
        styleObj.marginTop = 0;
      }
    } else {

      // single pill
      newState[dropdownTitle] = '';
    }

    // add selected option to available options in dropdown
    if (newState.dropdownConfig[dropdownTitle].options.indexOf(labelContent) < 0) {
      newState.dropdownConfig[dropdownTitle].options.push(labelContent);
    }

    // sort in-place by alphabetical order.
    newState.dropdownConfig[dropdownTitle].options.sort();
    this.setState(newState);
  }

  appendPill(event) {
    const {
      findCommonAncestor,
    } = this.constructor;
    const { BLOCK_SIZE } = this.props;
    const valueToAppend = event.target.textContent;
    const fieldElem = findCommonAncestor(event.target, 'slds-form-element__control');
    const dropdownTitle = fieldElem.title;
    const valueInState = this.state[dropdownTitle];
    const config = this.state.dropdownConfig[dropdownTitle];

    // copy config into new object
    let newState = { dropdownConfig: this.state.dropdownConfig };

    // if expected value is string
    newState[dropdownTitle] = valueToAppend;

    // if expected value is array
    if (config.isArray) {
      newState.dropdownConfig[dropdownTitle].dropDownStyle.marginTop += BLOCK_SIZE;
      if (valueInState.length) {
        valueInState.push(valueToAppend);
        newState[dropdownTitle] = valueInState;
      } else {
        newState[dropdownTitle] = [valueToAppend];
      }
    } else {

      // single pill input
      // close the dropdown
      config.close = true;

      // field had value,
      // add replaced value into options
      if (valueInState) {
        config.options.push(valueInState);
      }
    }

    // remove selected option from available options in dropdown
    const arr = filteredArray(config.options || [], valueToAppend);

    // order options alphabetically
    config.options = arr.sort();
    newState = Object.assign(this.state, newState);
    this.setState(newState);
  }

  // POST or PUT, depending on state
  doCreate() {
    const { values, sendResource, isEditing, name } = this.props;
    const postObject = getStateDataOnly(this.state);

    if (!postObject.lenses.length) {
      this.showError('Please enter a valid lens.');
    } else if (!postObject.subjects.length) {
      this.showError('Please enter a valid subject.');
    } else if (!postObject.name.length) {
      this.showError('Please enter a name for this perspective.');
    } else {

      // check if lens field is uid. if not, need to get uid for lens name
      const regexpUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!regexpUUID.test(postObject.lenses)) {
        let lens = values.lenses.filter((_lens) => {
          return _lens.name === postObject.lenses;
        });

        if (!lens.length) {
          this.showError('Please enter a valid lens name. No lens with name '
            + postObject.lenses + ' found');
        }

        postObject.lenses = lens[ZERO].id;
      }

      // for create perspectives, rename key lenses --> lensId,
      // and perspectives --> name. Start with deep copy values obj
      postObject.lensId = postObject.lenses;
      postObject.rootSubject = postObject.subjects;
      delete postObject.lenses;
      delete postObject.subjects;

      // go to created perspective page
      let method = 'POST'; // default
      postObject.url = '/v1/perspectives';

      if (isEditing) {
        method = 'PUT';

        // use the original perspective name
        postObject.url = postObject.url + '/' + name;
      }

      sendResource(method, postObject, this.showError);
    }
  }

  render() {
    const { cancelCreate, isEditing } = this.props;
    let dropdownObj = {};
    const { dropdownConfig, name } = this.state;
    const radioGroupConfig = {};
    const accountIcon = <span className={'slds-icon_container ' +
      'slds-icon-standard-account slds-pill__icon_container'}>
      <svg aria-hidden='true' className='slds-icon'>
        <use xlinkHref='../static/icons/standard-sprite/svg/symbols.svg#account'></use>
      </svg>
      <span className='slds-assistive-text'>Account</span>
    </span>;

    for (let key in dropdownConfig) {

      // if no default value, no pill
      let pillOutput = '';
      const value = this.state[key];
      const SUFFIX = 'Type';
      if (key.slice(-SUFFIX.length) === SUFFIX) {
        radioGroupConfig[key] = {
          highlightFirst: value === 'INCLUDE',
          title: key,
          onClick: this.handleRadioButtonClick,
        };
      }

      // if display value is array, use multi pill
      // else single pill
      // showInputElem {Bool} if true, show additional
      // input near dropdown
      const showInputElem = dropdownConfig[key].isArray;
      if (value.length) {
        if (dropdownConfig[key].isArray) {
          pillOutput = <Pill
            title={ value }
            key={ value }
            onRemove={this.deletePill}
          />;
        } else if (typeof value === 'string') {
          // Do not show input when there's pills
          pillOutput = <Pill
            icon={ accountIcon }
            title={ [value] }
            key={ value }
            onRemove={this.deletePill}
          />;
        }
      }

      const _config = Object.assign({}, dropdownConfig[key], { showInputElem });
      dropdownObj[key] = (
        <Dropdown { ..._config } >
         { pillOutput }
        </Dropdown>
      );
    }

    const errorMessage = this.state.error ? <ErrorRender
        hide={this.closeError.bind(this)}
        error={ this.state.error } /> :
      ' ';

    return (
      <Modal
        id='createPerspectiveModal'
        title={ isEditing ? 'Edit Perspective' : 'New Perspective' }
        onSave={ this.doCreate.bind(this) }
        onHide={ cancelCreate }
        primaryBtnTxt={ isEditing ? 'Save' : 'Create' }
        notificationBox={ errorMessage }
      >
        <div
          className='slds-form-element slds-lookup slds-is-open'
          data-select='single'
          data-scope='single'>
            <div className='slds-lookup__item--label slds-text-body--small' id='detailsbody'>
                <ul className='slds-lookup__list' role='presentation'>
                    <div className='slds-panel__section'>
                        <fieldset className='slds-form--compound'>
                            <div className='form-element__group '>
                                <div className='slds-form-element__row '>
                                    <div className='slds-form-element slds-size--1-of-2 is-required '>
                                        <label
                                          className='slds-form-element__label'
                                          htmlFor='text-input-01 '>
                                            <abbr className='slds-required ' title='required '>*</abbr>Name
                                          </label>
                                          <ControlledInput
                                            name='name'
                                            value={ this.state.name }
                                            onChange={ this.onInputValueChange.bind(this) }
                                            placeholder='Enter a perspective name' />
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className='slds-panel__section'>
                        <fieldset className='slds-form--compound'>
                            <div className='form-element__group'>
                                <div className='slds-form-element__row'>
                                    <div className='slds-form-element slds-size--1-of-2 '>
                                        <label
                                          className='slds-form-element__label'
                                          htmlFor='text-input-01'>
                                            <abbr className='slds-required' title='required'>*</abbr>Root Subject
                                          </label>
                                        <div className='slds-form-element__control'>
                                            { dropdownObj.subjects }
                                        </div>
                                    </div>
                                    <div className='slds-form-element slds-size--1-of-2 '>
                                        <label className='slds-form-element__label' htmlFor='namesArr-01'>
                                            <abbr className='slds-required' title='required'>*</abbr>Lens
                                          </label>
                                        <div className='slds-form-element__control'>
                                            { dropdownObj.lenses }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className='slds-panel__section'>
                        <h3 className='slds-text-heading--small slds-m-bottom--medium'>Filters</h3>
                        <fieldset className='slds-form--compound'>
                            <div className='form-element__group'>
                                <div className='slds-form-element__row'>
                                    <div className='slds-form-element slds-size--1-of-2 '>
                                        <label className='slds-form-element__label'>Aspect Tags</label>
                                        <RadioGroup { ...radioGroupConfig.aspectTagFilterType }/>
                                        { dropdownObj.aspectTagFilter }
                                    </div>
                                    <div className='slds-form-element slds-size--1-of-2 '>
                                        <label className='slds-form-element__label'>Subject Tags</label>
                                        <RadioGroup { ...radioGroupConfig.subjectTagFilterType }/>
                                        { dropdownObj.subjectTagFilter }
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className='slds-panel__section'>
                        <fieldset className='slds-form--compound'>
                            <div className='form-element__group'>
                                <div className='slds-form-element__row'>
                                    <div className='slds-form-element slds-size--1-of-2 '>
                                        <label className='slds-form-element__label'>Aspects</label>
                                        <RadioGroup { ...radioGroupConfig.aspectFilterType }/>
                                        { dropdownObj.aspectFilter }
                                    </div>
                                    <div className='slds-form-element slds-size--1-of-2 '>
                                        <label className='slds-form-element__label'>Status</label>
                                        <RadioGroup { ...radioGroupConfig.statusFilterType }/>
                                        { dropdownObj.statusFilter }
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                </ul>
            </div>
        </div>
      </Modal>
    );
  }
}

CreatePerspective.propTypes = {
  cancelCreate: PropTypes.func,
  sendResource: PropTypes.func,
  values: PropTypes.object,
  parms: PropTypes.object,
  BLOCK_SIZE: PropTypes.number,
};
// the pixel amount to move dropdown up or down
CreatePerspective.defaultProps = { BLOCK_SIZE: 25 };

export default CreatePerspective;
