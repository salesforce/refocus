/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/Dropdown.js
 *
 * Dumb component, takes click handler and options arr from props.
 * Renders interactive dropdown component.
 */

import React, { PropTypes } from 'react';

/**
 * Returns subset of data array that matches text.
 * @param {Array} dataArr The array of text to filter
 * @param {String} searchText The text to filter matches in array.
 * @param {Function} callback The function to call, given subset of array.
 */
function filterData(dataArr, searchText, callback) {
  const data = dataArr.filter(
    (entry) => entry.toUpperCase().indexOf(searchText.toUpperCase()) > -1
  );
  callback(data);
}

class Dropdown extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false, // dropdown is open or closed
      data: [], // data in dropdown
    };
    this.handleClose = this.handleClose.bind(this);
  }
  componentDidMount() {
    // click anywhere outside of container
    // to hide dropdown
    const containerEl = this.refs.dropdown;
    const closeDropdown = this.handleClose;
    document.addEventListener('click', (event) => {
      if (!containerEl.contains(event.target)) {
        closeDropdown();
      }
    }, true);
  }
  handleClose() {
    this.setState({
      open: false,
    });
  }
  handleFocus() {
    // show all options
    this.setState({
      open: true,
      data: this.props.options,
    });
  }
  handleKeyUp(event) {
    const searchText = event.target.value || '';
    this.setState({ data: [] });
    filterData(this.props.options, searchText, (data) => {
      this.setState({ data, loading: false });
    });
  }
  componentWillReceiveProps(nextProps) {
    // update dropdown options on props change
    if (nextProps.options !== this.props.options) {
      this.setState({ data: nextProps.options });
    }
    if (nextProps.close) {
      this.handleClose();
    }
  }
  render () {
    const {
      newButtonText,
      dropDownStyle,
      allOptionsLabel,
      placeholderText,
      defaultValue,
      title,
      showSearchIcon,
      onAddNewButton,
      onClickItem,
      showInputElem,
      children, // react elements
    } = this.props;
    const { data } = this.state;
    let outputUL = '';
    // if options exist, load them
    // if closeOnSelect is true, close the dropwon on click option
    if (data.length) {
      outputUL = <ul className='slds-lookup__list' role='presentation'>
        {data.map((optionsName) => {
          return (
            <li key={ optionsName }
                onClick={ onClickItem }
                className={'slds-lookup__item-action ' +
                  'slds-media slds-media--center'}>
                <svg aria-hidden='true'
                  className={'slds-icon slds-icon-standard-account' +
                    ' slds-icon--small slds-media__figure'}>
                  <use xlinkHref={'../static/icons/custom-sprite' +
                    '/svg/symbols.svg#custom39'}></use>
                </svg>
                { optionsName }
            </li>
          );
        }
        )}
      </ul>;
    }
    const inputElem = <input
      className='slds-lookup__search-input slds-input--bare'
      type='text'
      defaultValue={ defaultValue || '' }
      aria-autocomplete='list'
      role='combobox'
      aria-expanded='true'
      aria-activedescendant=''
      placeholder={ placeholderText || '' }
      onFocus={ this.handleFocus.bind(this) }
      onKeyUp={ this.handleKeyUp.bind(this) }
    />;
    // if there's child elements, render them
    // if there's child elements and showInputElem is true, show inputElem
    // if there's no child elements, show inputElem
    return (
      <div
        ref='dropdown'
        title={ title || 'dropdown' }
        className={'slds-form-element__control ' +
          'slds-grid slds-wrap slds-grid--pull-padded'}
      >
      <div className="slds-col--padded slds-size--1-of-1">
       { !children && inputElem}
       { children }
       { (children && showInputElem) && inputElem }
      </div>
        <div className={'slds-dropdown-trigger--click slds-align-middle ' +
          'slds-m-right--xx-small slds-shrink-none slds-is-open'}>
          { showSearchIcon &&
            <svg aria-hidden='true' className='slds-button__icon'>
            <use xlinkHref={'../static/icons/utility-sprite/' +
              'svg/symbols.svg#search'}></use>
          </svg>}
          { this.state.open &&
            <div
              style={ dropDownStyle }
              className='slds-dropdown slds-dropdown--left slds-scrollable--y'>
              <div
                className='slds-form-element slds-lookup slds-is-open'
                data-select='single' data-scope='single'>
                <div className='slds-lookup__item--label slds-text-body--small'>
                  { allOptionsLabel || 'All Options'}
                </div>
                { outputUL }
                { onAddNewButton && <div>
                  <a role='button'
                    onClick={ onAddNewButton }
                    className={'slds-lookup__item-action ' +
                      'slds-lookup__item-action--label'}>
                    <span className='lookup__item-action-label'>
                      <svg aria-hidden='true' className={'slds-icon ' +
                        'slds-icon--x-small slds-icon-text-default'}>
                        <use xlinkHref={'../static/icons/utility-sprite/' +
                          'svg/symbols.svg#add'}></use>
                      </svg>
                      <span className='slds-truncate'
                      >{ newButtonText || 'Add New' }</span>
                    </span>
                  </a>
                </div>}
              </div>
            </div>
          }
        </div>
      </div>
    );
  }
}

Dropdown.propTypes = {
  options: PropTypes.array,
  dropDownStyle: PropTypes.object,
  newButtonText: PropTypes.string,
  title: PropTypes.string, // which dropdown
  allOptionsLabel: PropTypes.string,
  placeholderText: PropTypes.string,
  defaultValue: PropTypes.string,
  onAddNewButton: PropTypes.func,
  onClickItem: PropTypes.func.isRequired,
  children: PropTypes.element,
  showSearchIcon: PropTypes.bool,
  showInputElem: PropTypes.bool,
  close: PropTypes.bool, // if true, close dropdown
};

export default Dropdown;
