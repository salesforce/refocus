/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/pages/List.js
 *
 * Dumb component, takes handlers and url from above.
 * Renders the table with the state resources.
 * Renders Create View with Modal, if url ends with /new
 * Each resource is a row in the table.
 * Each row has links to perform CRUD on the resource.
 */

import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router';
import * as fields from '../../config/list';
import * as createFields from '../../config/create';
import DataTable from '../common/DataTable';
import PageHeader from '../common/PageHeader';
import Form from '../common/Forms';
import Modal from '../common/Modal';

class List extends React.Component {
  constructor(props) {
    super(props);
    this.postForm = this.postForm.bind(this);
    this.doFetch = this.doFetch.bind(this);
    this.doDelete = this.doDelete.bind(this);
    this.toggleDelete = this.toggleDelete.bind(this);
    this.cancelDelete = this.cancelDelete.bind(this);
    this.cancelForm = this.cancelForm.bind(this);
    this.state = {
      delResource: false,
    };
  }

  /**
   * @param {string} id - Optional. Ie. 5eefe705-96b8-46f3-a1db-a51228fad440
   */
  toggleDelete(id) {
    this.setState({ delResource: id });
  }
  doDelete() {
    const { deleteResource, url } = this.props;
    deleteResource(url + '/' + this.state.delResource);
    this.toggleDelete(false);
  }
  cancelDelete() {
    this.toggleDelete(false);
  }
  cancelForm() {
    const { history, url } = this.props;
    // go back home
    history.push('/' + url.split('/')[1]);
  }

  postForm() {
    const { history, url, postResource, getFormData } = this.props;
    const form = this.refs.addResourceForm;
    const valueType = form.state.aspectRangeFormat;
    const formOutput = ReactDOM.findDOMNode(form);
    const goToUrl = '/' + url.split('/')[1];
    const resource = goToUrl.substr(1);
    const propertyMetaData = createFields[resource];
    const formObj = getFormData(formOutput, valueType, propertyMetaData);
    // go to details page
    postResource(formObj, goToUrl, (redirectUrl) => {
      history.push(redirectUrl);
    });
  }

  doFetch(newUrl) {
    const { url, fetchResources, params } = this.props;
    const fetchUrl = newUrl || url;
    const resource = fetchUrl.split('/')[1];
    // fetch all if on new page, or fetch specific resource
    params.identifier === 'new' ?
      fetchResources('/' + resource) :
      fetchResources(fetchUrl);
  }

  componentWillReceiveProps(newProps) {
    // fetch existing resources if url changed
    if (newProps.url !== this.props.url &&
      newProps.params.identifier !== 'new') {
      this.doFetch(newProps.url);
    }
  }

  componentDidMount() {
    this.doFetch();
  }

  render () {
    const { url, refocusReducer, urlQuery, params } = this.props;
    const resource = url.split('/')[1];
    const message = 'Do you want to delete ' + resource +
      ' ' + this.state.delResource + ', and all its associated samples?';
    const tableOpts = {
      resource,
      results: refocusReducer[resource],
      doDelete: this.toggleDelete,
      columnMetadata: fields[resource].propertyMetaData,
    };
    const formOpts = {
      ref: 'addResourceForm',
      subjects: refocusReducer[resource],
      propertyMetaData: createFields[resource],
      edit: true,
    };
    // if resource is subject, check urlQuery
    if (resource === 'subjects') {
      // need dummy for databable
      tableOpts.parentAbsolutePath = urlQuery.split('=').pop() || 'dummy';
      formOpts.parentAbsolutePath = urlQuery.split('=').pop();
    }

    return (
      <div>
        {this.state.delResource &&
          <Modal
            title={`Delete ${resource}`}
            onSave={ this.doDelete }
            onHide={ this.cancelDelete }
            primaryBtnTxt='Delete'
          >
            <p>{message}</p>
          </Modal>
        }
        <PageHeader resource={resource} >
          <Link to={ '/' + resource + '/new' }
            className='slds-button slds-button--neutral slds-not-selected'>
            <svg aria-hidden="true" className="slds-button__icon--stateful slds-button__icon--left">
              <use xlinkHref="../icons/utility-sprite/svg/symbols.svg#add"></use>
            </svg>New
          </Link>
        </PageHeader>
        <div className='slds-p-vertical--x-small slds-p-horizontal--large'>
          <DataTable {...tableOpts}/>
        </div>
        {(params.identifier === 'new') &&
        <Modal
          title={ 'Create new ' + resource.slice(0, -1) }
          onSave={ this.postForm }
          onHide={ this.cancelForm }
        >
          <Form {...formOpts}/>
        </Modal>
        }
      </div>
    );
  }
}

List.propTypes = {
  url: PropTypes.string,
  history: PropTypes.object,
  urlQuery: PropTypes.string,
  deleteResource: PropTypes.func,
  postResource: PropTypes.func,
  fetchResources: PropTypes.func,
  refocusReducer: PropTypes.object,
  getFormData: PropTypes.func,
  params: PropTypes.object,
};

export default List;
