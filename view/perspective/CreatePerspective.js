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
const ZERO = 0;
const ONE = 1;

/**
 * Returns the state object without any incidental data.
 * @param {Object} stateObject this component's state.
 * @ returns {Object} The state with bare minimum data.
 */
function getStateDataOnly(stateObject) {
  const stateCopy = JSON.parse(JSON.stringify(stateObject));
  delete stateCopy.dropdownConfig;
  delete stateCopy.error;
  return stateCopy;
}

/**
 *  Ie. "thisStringIsGood" --> This String Is Good
 * @param {String} string The string to split
 * @returns {String} The converted string, includes spaces.
 */
function convertCamelCase(string) {
  return string
      // insert a space before all caps
    .replace(/([A-Z])/g, ' $1')
    // uppercase the first character
    .replace(/^./, function(string) {
      return string.toUpperCase();
    });
}

/**
 * @param {DOM_element} el The element to find ancestor with selector from
 * @param {String} selector The selector of ancestor
 * @returns {DOM_element} The ancestor element that is closest to el
 */
function findCommonAncestor(el, selector) {
  let retval = null;
  while (el) {
    if (el.classList.contains(selector)) {
      retval = el;
      break;
    }
    el = el.parentNode;
  }
  return retval;
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
      ...props.stateObject,
    }; // default values
  }

  /**
   * Given array of objects, returns array of strings or primitives
   * of values of the field key
   *
   * @param {String} field The field of each value to return
   * @param {array} arrayOfObjects The array of objects to
   * get new array from
   * @returns {Array} The array of strings or primitives
   */
  static getArray(field, arrayOfObjects) {
    let arr = [];
    for (let i = ZERO; i < arrayOfObjects.length; i++) {
      if (arrayOfObjects[i].isPublished) {
        arr.push(arrayOfObjects[i][field]);
      }
    }

    return arr;
  }

  componentDidMount() {
    this.updateDropdownConfig();
  }
  updateDropdownConfig() {
    // attach config to keys, keys to dropdownConfig
    const { dropdownConfig, error } = this.state;
    let errorMessage = error;
    const { values } = this.props;
    let stateObject = getStateDataOnly(this.state);
    let config = {};
    const { getArray } = this.constructor;

    for (let key in stateObject) {
      const value = this.state[key];
      const convertedText = convertCamelCase(key);
      config = {
        title: key,
        defaultValue: Array.isArray(value) ? value.join('') : value,
        placeholderText: 'Select a ' + convertedText,
        options: values[key] || [],
        showSearchIcon: false,
        onClickItem: this.appendPill,
        dropDownStyle: { marginTop: 0 },
        showInputWithContent: Array.isArray(value),
      };
      if (key === 'subjects') {
        config.options = getArray('absolutePath', values[key]);
        config.placeholderText = 'Select a Subject...';
      } else if (key === 'lenses') {
        config.placeholderText = 'Select a Lens...';
        config.options = getArray('name', values[key]);
      } else if (key.slice(-6) === 'Filter') { // if key ends with Filter
        config.defaultValue = ''; // should be pills, not text
        config.allOptionsLabel = 'All ' + convertedText.replace(' Filter', '') + 's';
        if (key === 'aspectFilter') {
          config.options = getArray('name', values[key]);
          config.allOptionsLabel = 'All ' + convertedText.replace(' Filter', '') + ' Tags';
        } else if (key === 'statusFilter') {
          config.allOptionsLabel = 'All ' + convertedText.replace(' Filter', '') + 'es';
        }
        delete config.placeholderText;
        // remove value[i] if not in all appropriate values
        let notAllowedTags = [];
        for (let i = value.length - ONE; i >= 0; i--) {
          if (!values[key] || values[key].indexOf(value[i]) < ZERO) {
            notAllowedTags.push(value[i]);
          }
        }
        if (notAllowedTags.length) {
          // remove from state
          const newVals = value.filter((item) => {
              return notAllowedTags.indexOf(item) < ZERO;
          });
          errorMessage += ' ' + convertedText + ' ' + notAllowedTags.join(', ' ) + ' does not exist.';
          const stateRule = { error: errorMessage };
          stateRule[key] = newVals;
          this.setState(stateRule); // this won't be called until end of this method.
        }
      }
      dropdownConfig[key] = config;
    }
    this.setState({ dropdownConfig: dropdownConfig });
  }

  handleRadioButtonClick(event) {
    const buttonGroup = findCommonAncestor(event.target, 'slds-button-group');
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
    const value = event.target.value;
    // deep copy state object
    let stateRule = {};
    stateRule[event.target.name] = value;
    this.setState(stateRule);
  }
  deletePill(event) {
    const pillElem = findCommonAncestor(event.target, 'slds-pill');
    const labelContent = pillElem.getElementsByClassName('slds-pill__label')[ZERO].textContent;
    const fieldElem = findCommonAncestor(event.target, 'slds-form-element__control');
    const dropdownTitle = fieldElem.title;
    const valueInState = this.state[dropdownTitle];
    let newState = this.state;
    // if string, delete key, if array, delete from array
    if (Array.isArray(valueInState)) {
      const index = valueInState.indexOf(labelContent);
      valueInState.splice(index, ONE); // remove element from array;
      newState[dropdownTitle] = valueInState;
    } else if (typeof valueInState === 'string') {
      newState[dropdownTitle] = '';
    }

    // add selected option to available options in dropdown
    newState.dropdownConfig[dropdownTitle].options.push(labelContent);

    // if there's values in dropdown decrement dorpdown margin top. otherwise set margin top to 0
    newState.dropdownConfig[dropdownTitle].dropDownStyle.marginTop = valueInState.length < ONE ? -5 :
      this.state.dropdownConfig[dropdownTitle].dropDownStyle.marginTop -= 25; // TODO: get from DOM eleme
    this.setState(newState);
  }
  appendPill(event) {
    const valueToAppend = event.target.textContent;
    const fieldElem = findCommonAncestor(event.target, 'slds-form-element__control');
    const dropdownTitle = fieldElem.title;
    const valueInState = this.state[dropdownTitle];
    let newState = this.state;
    // if string, delete key, if array, delete from array
    if (Array.isArray(valueInState)) {
      newState[dropdownTitle].push(valueToAppend);
    } else if (typeof valueInState === 'string') {
      newState[dropdownTitle] = valueToAppend;
    }
    // remove selected option from available options in dropdown
    const arr = newState.dropdownConfig[dropdownTitle].options.filter((elem) => {
      return elem != valueToAppend;
    });
    newState.dropdownConfig[dropdownTitle].options = arr;

    // if there's no pill, use default margin-top
    newState.dropdownConfig[dropdownTitle].dropDownStyle.marginTop = valueInState.length < ONE ? -5 :
      this.state.dropdownConfig[dropdownTitle].dropDownStyle.marginTop += 25; // TODO: get from DOM eleme
    this.setState(newState);
  }
  doCreate() {
    const { values, sendResource } = this.props;
    const postObject = getStateDataOnly(this.state);
    if (!postObject.lenses.length) {
      this.showError('Please enter a valid lens.');
    } else if (!postObject.subjects.length) {
      this.showError('Please enter a valid subject.');
    } else if (!postObject.perspectives.length) {
      this.showError('Please enter a name for this perspective.');
    } else {
      // check if lens field is uid. if not, need to get uid for lens name
      const regexpUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!regexpUUID.test(postObject.lenses)) {
        let lens = values.lenses.filter((lens) => {
          return lens.name === postObject.lenses;
        });
        if (!lens.length) {
          this.showError('Please enter a valid lens name. No lens with name ' + postObject.lenses + ' found');
        }

        postObject.lenses = lens[ZERO].id;
      }
      // for create perspectives, rename key lenses --> lensId,
      // and perspectives --> name. Start with deep copy values obj
      postObject.lensId = postObject.lenses;
      postObject.rootSubject = postObject.subjects;
      postObject.name = postObject.perspectives;
      delete postObject.lenses;
      delete postObject.subjects;
      delete postObject.perspectives;
      // go to created perspective page
      sendResource('POST', postObject, this.showError);
    }
  }
  render() {
    const { values, cancelCreate } = this.props;
    let dropdownObj = {};
    const { dropdownConfig } = this.state;
    const radioGroupConfig = {};
    const accountIcon = <span className="slds-icon_container slds-icon-standard-account slds-pill__icon_container">
      <svg aria-hidden="true" className="slds-icon">
        <use xlinkHref="../static/icons/standard-sprite/svg/symbols.svg#account"></use>
      </svg>
      <span className="slds-assistive-text">Account</span>
    </span>;

    for (let key in dropdownConfig) {
      // if no default value, no pill
      let pillOutput = '';
      const value = this.state[key];
      if (key.slice(-4) === 'Type') {
        radioGroupConfig[key] = {
          highlightFirst: value === 'INCLUDE',
          title: key,
          onClick: this.handleRadioButtonClick,
        };
      }
      // // if display value is array, use multi pill
      // // else single pill
      if (value.length) {
        if (Array.isArray(value)) {
          pillOutput = <Pill
            title={ value }
            onRemove={this.deletePill}
          />;
        } else if (typeof value === 'string') {
          pillOutput = <Pill
            title={ [value] }
            icon={ accountIcon }
            onRemove={this.deletePill}
          />;
        }
      }
      dropdownObj[key] = (
        <Dropdown {...dropdownConfig[key]} >
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
        title={'New Perspective'}
        onSave={ this.doCreate.bind(this) }
        onHide={ cancelCreate }
        primaryBtnTxt='Create'
        notificationBox={ errorMessage }
      >
        <div
          className="slds-form-element slds-lookup slds-is-open"
          data-select="single"
          data-scope="single">
            <div className="slds-lookup__item--label slds-text-body--small" id="detailsbody">
                <ul className="slds-lookup__list" role="presentation">
                    <div className="slds-panel__section">
                        <fieldset className="slds-form--compound">
                            <div className="form-element__group ">
                                <div className="slds-form-element__row ">
                                    <div className="slds-form-element slds-size--1-of-2 is-required ">
                                        <label className="slds-form-element__label " htmlFor="text-input-01 ">
                                            <abbr className="slds-required " title="required ">*</abbr>Name</label>
                                          <ControlledInput
                                            name='perspectives'
                                            value={ this.state.perspectives }
                                            onChange={ this.onInputValueChange.bind(this) }
                                            placeholder='Enter a perspective name' />
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className="slds-panel__section">
                        <fieldset className="slds-form--compound">
                            <div className="form-element__group">
                                <div className="slds-form-element__row">
                                    <div className="slds-form-element slds-size--1-of-2 ">
                                        <label className="slds-form-element__label" htmlFor="text-input-01">
                                            <abbr className="slds-required" title="required">*</abbr>Root Subject</label>
                                        <div className="slds-form-element__control">
                                            { dropdownObj.subjects }
                                        </div>
                                    </div>
                                    <div className="slds-form-element slds-size--1-of-2 ">
                                        <label className="slds-form-element__label" htmlFor="namesArr-01">
                                            <abbr className="slds-required" title="required">*</abbr>Lens</label>
                                        <div className="slds-form-element__control">
                                            { dropdownObj.lenses }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className="slds-panel__section">
                        <h3 className="slds-text-heading--small slds-m-bottom--medium">Filters</h3>
                        <fieldset className="slds-form--compound">
                            <div className="form-element__group">
                                <div className="slds-form-element__row">
                                    <div className="slds-form-element slds-size--1-of-2 ">
                                        <label className="slds-form-element__label">Aspect Tags</label>
                                        <RadioGroup { ...radioGroupConfig.aspectTagFilterType }/>
                                        { dropdownObj.aspectTagFilter }
                                    </div>
                                    <div className="slds-form-element slds-size--1-of-2 ">
                                        <label className="slds-form-element__label">Subject Tags</label>
                                        <RadioGroup { ...radioGroupConfig.subjectTagFilterType }/>
                                        { dropdownObj.subjectTagFilter }
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className="slds-panel__section">
                        <fieldset className="slds-form--compound">
                            <div className="form-element__group">
                                <div className="slds-form-element__row">
                                    <div className="slds-form-element slds-size--1-of-2 ">
                                        <label className="slds-form-element__label">Aspects</label>
                                        <RadioGroup { ...radioGroupConfig.aspectFilterType }/>
                                        { dropdownObj.aspectFilter }
                                    </div>
                                    <div className="slds-form-element slds-size--1-of-2 ">
                                        <label className="slds-form-element__label">Status</label>
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
  stateObject: PropTypes.object,
};

export default CreatePerspective;
