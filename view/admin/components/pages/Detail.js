/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/pages/Detail.js
 *
 * Dumb component, takes handlers and url from above.
 * Renders the form with the edit resource button rows.
 */

import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import * as fields from '../../config/detail';
import Form from '../common/Forms';
import PageHeader from '../common/PageHeader';
import Modal from '../common/Modal';
import ButtonRowWhenRead from '../common/ButtonRowWhenRead';
import ErrorRender from '../common/ErrorRender';

const ONE = 1;
const ZERO = 0;

class Detail extends React.Component {
  constructor(props) {
    super(props);
    this.setInvalidFieldObj = this.setInvalidFieldObj.bind(this);
    this.showError = this.showError.bind(this);
    this.closeError = this.closeError.bind(this);
    this.processData = this.processData.bind(this);
    this.putForm = this.putForm.bind(this);
    this.handleDeleteClick = this.handleDeleteClick.bind(this);
    this.toggleEdit = this.toggleEdit.bind(this);
    this.turnOffDelete = this.turnOffDelete.bind(this);
    this.doDelete = this.doDelete.bind(this);
    this.state = {
      askDelete: false,
      error: '',
      invalidFieldObj: {},
    };
  }

  /* eslint-disable no-alert */
  handleDeleteClick() {
    this.setState({ askDelete: true });
  }

  doDelete() {
    const { history, deleteResource, url } = this.props;
    const resource = url.split('/')[ONE].slice(ZERO, -ONE);
    deleteResource(url);
    history.push(`/${resource}s`);
  }

  turnOffDelete() {
    this.setState({
      askDelete: false,
    });
  }

  // toggleEdit: change url to ?edit if not editing, and vice-versa
  toggleEdit() {
    // url: doesn't include the ?edit part
    const { url, isEditing, history } = this.props;
    const newUrl = isEditing ? url : url + '?edit';
    history.push(newUrl);
  }

  showError(error) {
    const errorMessage = (error && typeof error === 'object') ?
      JSON.stringify(error) : error;
    this.setState({ error: errorMessage });
  }
  closeError() {
    this.setState({ error: '' });
  }
  // obj contains invalid fields and their data
  setInvalidFieldObj(invalidFieldObj) {
    this.setState({
      invalidFieldObj,
    });
  }

  /**
   * Validates form data with regexp from config
   * If validation passes, post formObj
   * else update error state with fields that failed validation
   * @param {Array} propertyMetaData Contains data validation
   * @param {Object} formObj JSON object with all postable data from form
   */
  processData(propertyMetaData, formObj) {
    const { history, putResource, checkValidation, url } = this.props;
    // if obj is non-empty, show error
    const failedFields = checkValidation(propertyMetaData, formObj);
    const keys = Object.keys(failedFields);
    if (keys.length) {
      this.setInvalidFieldObj(failedFields);
      this.showError('error from update: ' +
        keys.join(', ') + ' failed validation');
    } else {
      // all fields are valid
      this.setInvalidFieldObj({});
      // go to details page
      putResource(formObj, url, (redirectUrl) => {
        history.push(redirectUrl);
      });
    }
  }

  putForm() { // for in-edit form only
    const { url, getFormData } = this.props;
    const form = this.refs.editResourceForm;
    const valueType = form.state.aspectRangeFormat;
    const formOutput = ReactDOM.findDOMNode(form);
    const resource = url.split('/')[ONE].slice(ZERO, -ONE);
    const propertyMetaData = fields[resource].propertyMetaData;
    const formObj = getFormData(formOutput, valueType, propertyMetaData);
    this.processData(propertyMetaData, formObj);
  }

  componentDidMount() {
    const { fetchResources, url } = this.props;
    fetchResources(url);
  }
  render () {
    const { url, refocusReducer, isEditing } = this.props;
    // resource: ie. subject, aspect
    const resource = url.split('/')[ONE].slice(ZERO, -ONE);
    // if no subject, do not render
    if (!refocusReducer[resource]) {
      return <p>No resource to render</p>;
    }
    let deleteFunc;
    let name = '';
    let addChildLink = '';
    if (resource.indexOf('subject') >= ZERO) {
      // pass in the delete handler iff subject is childless
      deleteFunc = (refocusReducer[resource].childCount) ?
        null : this.handleDeleteClick;
      addChildLink = '/' + resource + 's/new?parentAbsolutePath=' +
        refocusReducer[resource].absolutePath;
    } else {
      deleteFunc = this.handleDeleteClick;
      name = refocusReducer[resource].name;
    }
    const { invalidFieldObj } = this.state;
    const formOptions = {
      propertyMetaData: fields[resource].propertyMetaData,
      // if there's invalid input, show them so the user can correct them
      data: Object.keys(invalidFieldObj).length ?
        Object.assign(refocusReducer[resource], invalidFieldObj) :
        refocusReducer[resource],
    };
    const message = 'Do you want to delete this ' + resource +
      ', and all its associated samples?';
    const errorMessage = this.state.error ? <ErrorRender
        hide={this.closeError.bind(this)}
        error={ this.state.error }
        displayRelative={ true }
        /> :
      ' ';

    return (
      <div>
        {this.state.askDelete &&
          <Modal
            title={`Delete ${resource}`}
            onSave={ this.doDelete }
            onHide={ this.turnOffDelete }
            primaryBtnTxt='Delete'
          >
            <p>{message}</p>
          </Modal>
        }
        <PageHeader
          resource={resource}
          name={name}
          goBackUrl={ `/${resource}s` }
        >
          <ButtonRowWhenRead
            setFormFieldToEdit={this.toggleEdit}
            addChildLink={addChildLink}
            deleteResource={deleteFunc}
          />
        </PageHeader>
        <div className='slds-p-vertical--x-small slds-p-horizontal--large'>
          <Form
            edit={false}
            { ...formOptions}
          />
          {isEditing &&
            <Modal
              title={`Edit ${resource}`}
              resource={ resource }
              onSave={ this.putForm }
              // toggles isEditing to off
              onHide={ this.toggleEdit }
              notificationBox={ errorMessage }
            >
              <Form
                edit={true}
                ref='editResourceForm'
                { ...formOptions}
              />
          </Modal>
          }
        </div>
      </div>
    );
  }
}

Detail.propTypes = {
  isEditing: PropTypes.bool,
  url: PropTypes.string,
  deleteResource: PropTypes.func,
  putResource: PropTypes.func,
  fetchResources: PropTypes.func,
  refocusReducer: PropTypes.object,
  history: PropTypes.object,
  getFormData: PropTypes.func,
  checkValidation: PropTypes.func,
  changeAspectRangeFormat: PropTypes.func,
};
export default Detail;
