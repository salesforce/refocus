/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/type/RoomTypeComponent.js
 *
 * Manages RoomType object page state.
 */
import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

class RoomTypeComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className='slds-has-divider_bottom-space'>
        <div className='slds-button-group slds-m-left_none slds-m-top_x-small' role='group'>
          <button className='slds-button slds-button_neutral'>Edit</button>
          <button className='slds-button slds-button_neutral'>Deactivate</button>
        </div>
      </div>
    );
  }
}

RoomTypeComponent.propTypes = {
};

RoomTypeComponent.defaultProps = {
};

export default RoomTypeComponent;
