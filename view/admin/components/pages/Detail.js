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

class Detail extends React.Component {
  constructor(props) {
    super(props);
    this.state = { askDelete: false };
    this.putForm = this.putForm.bind(this);
    this.handleDeleteClick = this.handleDeleteClick.bind(this);
    this.toggleEdit = this.toggleEdit.bind(this);
    this.doDelete = this.doDelete.bind(this);
  }

  /* eslint-disable no-alert */
  handleDeleteClick() {
    this.setState({ askDelete: true });
  }

  doDelete() {
    const { history, deleteResource, url } = this.props;
    const resource = url.split('/')[1].slice(0, -1);
    deleteResource(url);
    history.push(`/${resource}s`);
  }

  // toggleEdit: change url to ?edit if not editing, and vice-versa
  toggleEdit() {
    // url: doesn't include the ?edit part
    const { url, isEditing, history } = this.props;
    const newUrl = isEditing ? url : url + '?edit';
    history.push(newUrl);
  }
  putForm() { // for in-edit form only
    const { history, url, putResource, getFormData } = this.props;
    const form = this.refs.editResourceForm;
    const valueType = form.state.aspectRangeFormat;
    const formOutput = ReactDOM.findDOMNode(form);
    const resource = url.split('/')[1].slice(0, -1);
    const propertyMetaData = fields[resource].propertyMetaData;
    const formObj = getFormData(formOutput, valueType, propertyMetaData);
    // go to details page
    putResource(formObj, url, (goToUrl) => {
      history.push(goToUrl);
    });
  }
  componentDidMount() {
    const { fetchResources, url } = this.props;
    fetchResources(url);
  }
  render () {
    const { url, refocusReducer, isEditing } = this.props;
    // ie. subject, aspect
    const resource = url.split('/')[1].slice(0, -1);
    // if no subject, do not render
    if (!refocusReducer[resource]) {
      return <p>No resource to render</p>;
    }
    let deleteFunc;
    let name = '';
    let addChildLink = '';
    if (resource.indexOf('subject') >= 0) {
      // pass in the delete handler iff subject is childless
      deleteFunc = (refocusReducer[resource].childCount) ?
        null : this.handleDeleteClick;
      addChildLink = '/' + resource + 's/new?parentAbsolutePath=' +
        refocusReducer[resource].absolutePath;
    } else {
      deleteFunc = this.handleDeleteClick;
      name = refocusReducer[resource].name;
    }

    const formOptions = {
      propertyMetaData: fields[resource].propertyMetaData,
      data: refocusReducer[resource],
    };
    const message = 'Do you want to delete this ' + resource +
      ', and all its associated samples?';
    return (
      <div>
        {this.state.askDelete &&
          <Modal
            title={`Delete ${resource}`}
            onSave={ this.doDelete }
            onHide={ this.toggleEdit }
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
              onHide={ this.toggleEdit }
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
  changeAspectRangeFormat: PropTypes.func,
};
export default Detail;
