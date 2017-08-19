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
const ZERO = 0;
const ONE = 1;

/**
 * Returns subset of data array that matches text.
 * @param {Array} dataArr The array of text to filter
 * @param {String} searchText The text to filter matches in array.
 * @param {Function} callback The function to call, given subset of array.
 */
function filterData(dataArr, searchText, callback) {
  const data = dataArr.filter(
    (entry) => entry.toUpperCase().indexOf(searchText.toUpperCase()) > -ONE
  );
  callback(data);
}

/**
 * Returns the index of the defaultValue in array options.
 * Or -1 if empty array
 * @param {Array} options
 * @param {String} defaultValue
 * @returns {Integer} Index of the defaultValue in options
 */
function getIndexFromArray(options, defaultValue) {
  let index = -ONE; // default: no options in dropdown
  if (options.length) {
    index = options.indexOf(defaultValue);
  }
  return index;
}

class Dropdown extends React.Component {

  /**
   * The index wraps around SIZE
   * @param {String} oldIndex
   * @param {Integer} size
   * @param {Bool} direction true to go up,
   * false to go down (increment index)
   * @returns {Integer} updated index
   */
  static getupdatedIndex(oldIndex, size, direction) {
    let newIndex = ZERO;
    if (direction) {
      newIndex = oldIndex === ZERO ? size-ONE : oldIndex-ONE;
    } else {
      newIndex = (oldIndex+ONE)%size;
    }

    return newIndex;
  }

  constructor(props) {
    super(props);
    this.state = {
      open: false, // dropdown is open or closed
      data: props.options, // data in dropdown
      highlightedIndex: getIndexFromArray(props.options, props.defaultValue),
    };
    this.toggle = this.toggle.bind(this);
  }

  componentDidMount() {
    // click anywhere outside of container
    // to hide dropdown
    const containerEl = this.refs.dropdown;
    const closeDropdown = this.toggle;
    document.addEventListener('click', (event) => {
      if (!containerEl.contains(event.target)) {
        closeDropdown(false);
      }
    }, true);
  }

  /**
   * @param {Boolean} bool If true, open
   * else close
   */
  toggle(bool) {
    this.setState({
      open: bool,
    });
  }

  handleFocus() {
    // show all options
    this.setState({
      open: true,
      data: this.props.options,
    });
  }

  handleKeyUp(evt) {
    const Key = {
      UP: 38,
      DOWN: 40,
      ENTER: 13,
    };
    // enter key, up or down key, or text change
    const event = evt || window.event; // for IE compatible
    // also for cross-browser compatible
    const keycode = event.keyCode || event.which;
    const { highlightedIndex } = this.state;
    const { getupdatedIndex } = this.constructor;
    const { options } = this.props;
    if (keycode === Key.UP) {
      this.setState({
        highlightedIndex: getupdatedIndex(
          highlightedIndex,
          options.length,
          true,
        ),
      });
    } else if (keycode === Key.DOWN) {
      this.setState({
        highlightedIndex: getupdatedIndex(
          highlightedIndex,
          options.length,
          false,
        ),
      });
    } else if (keycode === Key.ENTER && this.props.renderAsLink) {
      const persName = options[highlightedIndex];
      window.location.href = '/perspectives/' + persName;
    } else {
      const searchText = event.target.value || '';
      this.setState({ data: [] });
      filterData(this.props.options, searchText, (data) => {
        this.setState({ data, loading: false });
      });
    }
  }
  componentWillReceiveProps(nextProps) {
    // update dropdown options on props change
    if (nextProps.options !== this.props.options) {
      this.setState({
        data: nextProps.options,
      });
    }
    if (nextProps.close) {
      this.toggle(false);
    }
  }
  render () {
    const {
      options,
      newButtonText,
      dropDownStyle,
      allOptionsLabel,
      placeholderText,
      title,
      onAddNewButton,
      onClickItem,
      onEdit,
      showInputElem,
      children, // react elements
      defaultValue,
      showEditIcon,
      renderAsLink, //boolean
    } = this.props;
    const { data } = this.state;
    let outputUL = '';
    // if options exist, load them
    if (data.length) {
      outputUL = <ul className="slds-lookup__list" role="menu">
        {data.map((optionsName, index) => {
          // by default do not redirect page onclick
          const link = renderAsLink ? '/perspectives/' + optionsName : 'javascript:void(0)';
          let listClassName = 'slds-dropdown__item';
          if (index === this.state.highlightedIndex) {
            listClassName += ' slds-is-selected';
          }
          const itemOutput = !renderAsLink ? optionsName : <a
            href= { optionsName }>
            { optionsName }
          </a>;
          // TODO: refactor to get selected item out of props
          return <li key={ optionsName }
          onClick={ onClickItem }
          className={ listClassName } role='presentation'>
            <a href={ link } role='menuitemcheckbox' aria-checked='true'>
              <span className='slds-truncate'>
                <svg className={'slds-icon slds-icon--selected slds-icon--x-small ' +
                'slds-icon-text-default slds-m-right--x-small'} aria-hidden='true'>
                  <use xlinkHref='../static/icons/utility-sprite/svg/symbols.svg#check'></use>
                </svg>{ optionsName }</span>
                {showEditIcon && <svg onClick={ onEdit.bind(this) }
                  className={'slds-icon slds-icon--x-small slds-icon-text-default' +
                  ' slds-m-left--small slds-shrink-none'} aria-hidden='true'>
                    <use xlinkHref='../static/icons/utility-sprite/svg/symbols.svg#edit'></use>
                  </svg>
                }
            </a>
          </li>
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
      <div className='slds-col--padded slds-size--1-of-1'>
       { !children && inputElem}
       { children }
       { (children && showInputElem) && inputElem }
      </div>
        <div className={'slds-dropdown-trigger--click slds-align-middle ' +
          'slds-m-right--xx-small slds-shrink-none slds-is-open'}>
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
  onEdit: PropTypes.func,
  onClickItem: PropTypes.func.isRequired,
  children: PropTypes.element,
  showInputElem: PropTypes.bool,
  close: PropTypes.bool, // if true, close dropdown
  renderAsLink: PropTypes.bool, // render list item as link
};

export default Dropdown;
