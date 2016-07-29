/**
 * view/admin/components/common/ButtonRowWhenRead.js
 *
 * Renders Back, Delete, Edit, and Add Child buttons.
 * If delete handler is not passed in, the resource is not delete-able,
 * and the delete button becomes read-only.
 */

import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';

class ButtonRowWhenRead extends Component {
  render() {
    const deleteButtonClassName = 'slds-button ' +
    'slds-button--neutral deleteButton';
    const { deleteResource, setFormFieldToEdit, addChildLink } = this.props;
    const deleteButton = deleteResource ?
      <button onClick={ deleteResource }
         className={ deleteButtonClassName }
         role='button'>
        Delete
      </button> :
      <button className={ deleteButtonClassName } disabled>Delete</button>;

    return (
      <div className='slds-button-group readButtonRow' role='group'>
        {addChildLink &&
          <Link
            to={addChildLink}
            className='slds-button slds-button--neutral addChildLink'
            role='button'>
            Add Child
          </Link>
        }
        {deleteButton}
        <button onClick={setFormFieldToEdit}
           className='slds-button slds-button--neutral editButton'
           role='button'>
          Edit
        </button>
      </div>
    );
  }
}

ButtonRowWhenRead.propTypes = {
  deleteResource: PropTypes.func,
  addChildLink: PropTypes.string,
  setFormFieldToEdit: PropTypes.func.isRequired,
};

export default ButtonRowWhenRead;
