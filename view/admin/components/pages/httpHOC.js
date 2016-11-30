/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/pages/httpHOC.js
 *
 * Smart component, maps dispatch and state to props.
 * Passes http handlers to child components.
 */

import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import _ from 'lodash';
import List from './List';
import Detail from './Detail';
import Header from '../common/Header';
import { getFormData, checkValidation } from '../../utils/getFormData';
import ErrorRender from '../common/ErrorRender';
import MessageRender from '../common/MessageRender';
import * as actions from '../../actions/index';

class httpHOC extends React.Component {
  constructor() {
    super();
    this.closeDialogue = this.closeDialogue.bind(this);
  }
  closeDialogue() {
    // change state of message or error to null
    this.props.hideError();
    this.props.hideMessage();
  }

  // if there is children, render children (ie. detail, create view)
  // else render list view
  render () {
    const {
      location,
      refocusReducer,
      params, // identifier is new or resourceName or resourceID
    } = this.props;
    const url = location.pathname;
    const urlQuery = location.search;
    const isEditing = urlQuery.indexOf('?edit') > -1;
    const { message, error } = refocusReducer;
    const propsToChild = {
      checkValidation,
      url,
      isEditing,
      urlQuery,
      getFormData,
      ...this.props,
    };

    return (
      <div>
        <Header />
        {message ? <MessageRender
          hide={this.closeDialogue}
          message={ message } /> :
        ' '}
        {error ? <ErrorRender
          hide={this.closeDialogue}
          error={ error } /> :
        ' '}
        {(params.identifier === 'new' || !params.identifier) ?
          <List {...propsToChild} /> :
          <Detail {...propsToChild} />
        }
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    refocusReducer: state.refocusReducer,
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return bindActionCreators(actions, dispatch);
};

httpHOC.propTypes = {
  history: PropTypes.object,
  location: PropTypes.object,
  postResource: PropTypes.func,
  putResource: PropTypes.func,
  deleteResource: PropTypes.func,
  fetchResources: PropTypes.func,
  hideError: PropTypes.func,
  hideMessage: PropTypes.func,
  refocusReducer: PropTypes.object,
  children: PropTypes.any,
  actions: PropTypes.object,
  params: PropTypes.object,
  getFormData: PropTypes.func,
  checkValidation: PropTypes.func,
};

export default connect(mapStateToProps, mapDispatchToProps,
  (stateProps, dispatchProps, ownProps) => {
    return _.merge(
      stateProps,
      dispatchProps,
      ownProps
    );
  })(httpHOC);
