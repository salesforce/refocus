/**
 * view/admin/Root.js
 *
 * Given store and history, renders the appropriate component
 * per given react-router path
 */

import React, { PropTypes } from 'react';
import { Route, Router } from 'react-router';
import { Provider } from 'react-redux';
import {
  httpHOC,
  List,
} from './components';

class Root extends React.Component {
  render() {
    const { store, history } = this.props;
    return (
      <Provider store={ store } >
        <Router history={ history }>

            <Route component={ httpHOC }>
              <Route path='aspects' component={ List } />
            </Route>

            <Route component={ httpHOC }>
              <Route path='samples' component={ List } />
            </Route>

            <Route component={ httpHOC }>
              <Route path='subjects' component={ List } />
            </Route>

            <Route path='aspects/:identifier' component={ httpHOC } />

            <Route path='samples/:identifier' component={ httpHOC } />

            <Route path='subjects/:identifier' component={ httpHOC } />

        </Router>
      </Provider>
    );
  }
}

Root.propTypes = {
  store: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
};
export default Root;

