/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/ListController.js
 *
 * Manages perspective page state.
 * Passes on data to CreatePerspective
 */
import React, { PropTypes } from 'react';
import request from 'superagent';
const u = require('../../utils');

class ListController extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { values } = this.props;
    return (
      <div>
        {values[0].id}
      </div>
    );
  }
}

ListController.PropTypes = {
  // contains perspective, subjects, ...
  values: PropTypes.object,
};

export default ListController;
