/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/PageHeader.js
 *
 * Contains the page title, and any buttons
*/

import React, { PropTypes } from 'react';
import { Link } from 'react-router';

// resource: subject. subjects, aspect, aspects, ...
// name: APILOGIN or Salesforce
class PageHeader extends React.Component {
  render() {
    const { resource, children, name, goBackUrl } = this.props;
    let iconName = 'apps';
    if (resource.indexOf('subject') > -1) {
      iconName = 'account';
    } else if (resource.indexOf('aspect') > -1) {
      iconName = 'opportunity';
    }
    const upperCaseResource = resource.toUpperCase();
    const displayName = name || upperCaseResource;
    return (
      <div className='slds-page-header'>
        {goBackUrl &&
          <Link to={ goBackUrl } className='backUrl'>
            <svg aria-hidden='true' className='slds-button__icon--stateful slds-button__icon--left'>
              <use xlinkHref='../static/icons/utility-sprite/svg/symbols.svg#back'></use>
            </svg>{`BACK TO ${upperCaseResource} LIST` }
          </Link>
        }
        <div className='slds-grid slds-grid--align-spread'>
          <div className='slds-media__figure'>
            <span className={'slds-icon_container slds-icon-standard-' + iconName}>
              <svg aria-hidden='true' className='slds-icon slds-icon--large'>
                <use xlinkHref={'../static/icons/standard-sprite/svg/symbols.svg#' + iconName}></use>
              </svg>
            </span>
          </div>
          <div className='slds-media__body'>
            { name &&
              <p
                className='slds-text-body--small slds-page-header__info'>
                { upperCaseResource }
              </p>
            }
            <p
              className='slds-page-header__title slds-truncate slds-align-left'
              title={displayName}>
              {displayName}
            </p>
          </div>
          <div>{children}</div>
        </div>
      </div>
    );
  }
}

PageHeader.propTypes = {
  resource: PropTypes.string,
  goBackUrl: PropTypes.string,
  name: PropTypes.string,
};

export default PageHeader;
