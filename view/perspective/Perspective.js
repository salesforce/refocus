/**
 * view/perspective/Perspective.js
 *
 * Dumb component, takes perspectives arr from props.
 * Renders interactive dropdown component names.
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

class Perspective extends React.Component {
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
    const containerEl = document.getElementById('searchborder');
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
      data: this.props.persNames,
    });
  }
  handleKeyUp(event) {
    const searchText = event.target.value || '';
    this.setState({ data: [] });
    filterData(this.props.persNames, searchText, (data) => {
      this.setState({ data, loading: false });
    });
  }
  render () {
    const { data } = this.state;
    let outputUL = '';
    // if perspectives exist, load them
    if (data.length) {
      outputUL = <ul className='slds-lookup__list' role='presentation'>
        {data.map((perspectiveName) => {
          return (
            <li key={ perspectiveName }>
              <a
                href={'/perspectives/' + perspectiveName}
                className='slds-lookup__item-action slds-media slds-media--center'
                role='option'>
                <svg aria-hidden='true'
                  className='slds-icon slds-icon-standard-account slds-icon--small slds-media__figure'>
                  <use xlinkHref='../icons/custom-sprite/svg/symbols.svg#custom39'></use>
                </svg>
                { perspectiveName }
              </a>
            </li>
          );
        }
        )}
      </ul>;
    }
    return (
      <div
        className='slds-form-element__control slds-grid slds-box--border'
        id='searchborder'
      >
          <input id='perspective-input'
          className='slds-lookup__search-input slds-input--bare'
          type='text'
          defaultValue={ this.props.name || '' }
          aria-autocomplete='list'
          role='combobox'
          aria-expanded='true'
          aria-activedescendant=''
          placeholder='Search Perspectives'
          onFocus={ this.handleFocus.bind(this) }
          onKeyUp={ this.handleKeyUp.bind(this) }
        />
        <div className='slds-dropdown-trigger--click slds-align-middle slds-m-right--xx-small slds-shrink-none slds-is-open'>
          <svg aria-hidden='true' className='slds-button__icon'>
            <use xlinkHref='../icons/utility-sprite/svg/symbols.svg#search' id='arrow'></use>
          </svg>
          { this.state.open &&
            <div className='slds-dropdown slds-dropdown--left slds-scrollable--y' id='switchdropdown'>
              <div className='slds-form-element slds-lookup slds-is-open' data-select='single' data-scope='single'>
                <div className='slds-lookup__item--label slds-text-body--small'>All Perspectives</div>
                { outputUL }
              </div>
            </div>
          }
        </div>
      </div>
    );
  }
}

Perspective.propTypes = {
  persNames: PropTypes.array,
  name: PropTypes.string,
};

export default Perspective;
