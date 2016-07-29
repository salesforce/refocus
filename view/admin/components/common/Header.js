/**
 * view/admin/components/common/Header.js
 *
 * Contains the logo and links to main sections.
*/

import React from 'react';
import { Link } from 'react-router';

const Header = () =>
<header className='header slds-size--1-of-1' role='banner'>
    <div className='slds-grid slds-grid--align-spread'>
      <div className='slds-p-vertical--x-small slds-p-horizontal--medium'>
          <img
            id='logo'
            src='//s3-us-west-2.amazonaws.com/s.cdpn.io/8005/salesforce-logo.png' />
          <h1
            className='slds-page-header__title'
            title='Record Title'>
            Refocus Admin
          </h1>
      </div>
      <div
        className='slds-p-vertical--x-small slds-p-horizontal--medium button-group right'>
          <Link to='/subjects'>Subjects</Link>
          <Link to='/aspects'>Aspects</Link>
          <Link to='/samples'>Samples</Link>
      </div>
    </div>
</header>;

export default Header;
