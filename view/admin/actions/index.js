/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/actions/index.js
 *
 * Action creators and action-related helper functions.
 */

import superagent from 'superagent';
import * as constants from '../constants';
const env = process.env.NODE_ENV || 'development';
const API_URL = '/v1';
const ONE = 1;
const ZERO = 0;
// ACTION CREATORS
// -----------------------------------------------------------------

/**
 * Returns an action object
 * @returns {Object} action An action type
 */
function hideError() {
  return {
    type: constants.HIDE_ERROR,
  };
}

/**
 * Returns an action object
 * @returns {Object} action An action type
 */
function hideMessage() {
  return {
    type: constants.HIDE_MESSAGE,
  };
}

/**
 * Returns an action object
 * @param {Object, String} Make a string representation of it.
 * @returns {Object} action An action type
 */
function handleError(error) {
  const errorMessage = (error && typeof error === 'object') ?
    JSON.stringify(error) : error;
  return {
    type: constants.SHOW_ERROR,
    error: errorMessage,
  };
}

/**
 * Returns an action object
 * @param {String} message The message
 * @returns {Object} action The action type
 */
function handleMessage(message) {
  return {
    type: constants.SHOW_MESSAGE,
    message
  };
}

// ACTION_RELATED HELPER FUNCTIONS
// -----------------------------------------------------------------

/**
 * Returns an action with specified type and payload
 *
 * @param {String} actionName The type of action.
 * @param {String} key The field name for the payload
 * @param {Object} payload The value of the key
 * @returns {Object} The returned action
 */
function createActionWithPayload(actionName, key, payload) {
  const action = {
    type: actionName
  };
  action[key] = payload;
  return action;
}

/**
 * Replaces the stringified booleans in the values of the obejct
 * with boolean values
 *
 * @param {Object} formObj JSON representation of the form object
 * @returns {Object} The formObj with booleans, instead of stringified booleans
 */
function turnStringToBoolean(formObj) {
  for (const key in formObj) {
    if (formObj[key] === 'true') {
      formObj[key] = true;
    } else if (formObj[key] === 'false') {
      formObj[key] = false;
    }
  }
  return formObj;
}

/**
 * Given the request's url, returns an action and a key.
 * The action and key describes the changes to the state.
 *
 * @param {String} verb The verb to append to resourceName. Ie. FETCH, POST
 * @param {String} url The url to get key and resourceName from
 * either /resourceNames, or /resourceName/idOrName
 * @returns {Object} The actionName and the key, derived from the input url
 */
function getActionAndKeyFromUrl(verb, url) {
  // defaults
  const _verb = verb || 'FETCH';
  let key = 'subjects';
  let actionName = constants[_verb + key.toUpperCase()];
  const resource = url.split('/')[ONE];
  // check for pathname after resource:
  // /aspects/ split into arr -> ["", "aspects", ""]
  if (_verb === 'FETCH' && !url.split('/')[2]) {
    // FETCH resources. url is /resource
    key = resource;
    actionName = constants[_verb + '_' + resource.toUpperCase()];
  } else {
    // single resource change, create actionName with verb_upperCase -s
    const upToLastChar = resource.slice(ZERO, -ONE);
    actionName = constants[_verb + '_' + upToLastChar.toUpperCase()];
    key = upToLastChar;
  }
  return { key, actionName };
}

// HTTP ACTIONS
// -----------------------------------------------------------------
/**
 * DELETES/GETS from the specified url.
 *
 * @param {String} verb The HTTP verb, ie. 'GET' or 'DELETE'
 * @param {String} url The relative url to GET or DELETE from
 * @returns {Promise} If successful, the promise wraps the returned resource(s).
 * Else the error handler gets the error.
 */
function requestWithOutPayload(verb, url) {
  if (!url) {
    throw new Error('Cannot get/delete without url.');
  }
  return new Promise((resolve, reject) => {
    superagent(verb, API_URL + url)
    .set('Content-Type', 'application/json')
    .end((error, response) => {
      error ? reject(error) : resolve(response.body);
    });
  });
}

/**
 * POSTS/PATCHES the resource, with the specified object
 *
 * @param {Object} requestObject The object with url, HTTP verb, and formObject
 * @returns {Promise} If successful, the promise wraps the returned resource(s).
 * Else the error handler gets the error.
 */
function requestWithPayload(requestObject) {
  if (!requestObject) {
    throw new Error('Cannot post/patch without form object.');
  }
  const { url, verb, formObj } = requestObject;
  return new Promise((resolve, reject) => {
    superagent(verb, API_URL + url)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(formObj))
    .end((error, response) => {
      error ? reject(error) : resolve(response.body);
    });
  });
}

/**
 * Figures out resource: ie. aspect or aspects, based on the url.
 * Dipatches GET request to the supplied url
 * On returned response, dispatch success or error handlers.
 *
 * @param {String} url A relative url: ie. '/aspects' or '/subjects'
 * or '/subjects/73edeac7-de73-41f6-bf99-33d4a5557434'
 */
function fetchResources(url) {
  const { key, actionName } = getActionAndKeyFromUrl('FETCH', url);
  return (dispatch) => {
    requestWithOutPayload('GET', url, actionName)
    .then((res) => {
      const action = createActionWithPayload(actionName, key, res);
      dispatch(action);
    })
    .catch((err) => {
      dispatch(handleError(err));
    });
  };
}

/**
 * Figures out resource: aspect or subject, based on the url.
 * Dipatches DELETE request to the supplied url
 * On returned response, dispatch success or error handlers.
 *
 * @param {String} url The relative url to the to-be-deleted resource:
 * ie. /subjects/73edeac7-de73-41f6-bf99-33d4a5557434
 */
function deleteResource(url) {
  if (!url) {
    throw new Error('Cannot delete without url.');
  }

  const { key, actionName } = getActionAndKeyFromUrl('DELETE', url);
  return (dispatch) => {
    requestWithOutPayload('DELETE', url)
    .then((res) => {
      const action = createActionWithPayload(actionName, key, res);
      dispatch(action);
      // dispatch fetchResources with url ie. /subjects
      dispatch(fetchResources(url.slice(ZERO, url.lastIndexOf('/'))));
      dispatch(handleMessage('Successfully deleted ' + key + ': ' + res.id));
    })
    .catch((err) => {
      dispatch(handleError(err));
    });
  };
}

/**
 * Figures out resource: aspect or subject, based on the url.
 * Dipatches PATCH request to the supplied url
 * Calls helper function to turn string'd false/true into boolean values
 *
 * @param {Object} formObj The JSON representation of the form
 * @param {String} url The relative url to the to-be-deleted resource:
 * ie. /subjects/73edeac7-de73-41f6-bf99-33d4a5557434
 * @param {Function} callback The function to call, on successful response
 * On returned response, dispatch success or error handlers.
 */
function putResource(formObj, url, callback) {
  const { key, actionName } = getActionAndKeyFromUrl('PUT', url);
  const transformedObject = turnStringToBoolean(formObj);
  const requestObject = {
    verb: 'PUT',
    formObj: transformedObject,
    url,
  };

  return (dispatch) => {
    requestWithPayload(requestObject, callback)
    .then((res) => {
      const action = createActionWithPayload(actionName, key, res);
      dispatch(action);
      callback('/' + url.split('/')[ONE] + '/' + res.id);
      dispatch(handleMessage('Successfully PUTted ' + key + ': ' + res.id));
    })
    .catch((err) => {
      dispatch(handleError(err));
    });
  };
}

/**
 * Figures out resource: aspect or subject, based on the url.
 * Dipatches POST request to the supplied url
 * Calls helper function to turn string'd false/true into boolean values
 *
 * @param {Object} formObj The JSON representation of the form
 * @param {String} url The relative url to post resource:
 * ie. /subjects or /aspects
 * @param {Function} callback The function to call, on successful response
 * On returned response, dispatch success or error handlers.
 */
function postResource(formObj, url, callback) {
  const { key, actionName } = getActionAndKeyFromUrl('POST', url);
  const transformedObject = turnStringToBoolean(formObj);
  const requestObject = {
    verb: 'POST',
    formObj: transformedObject,
    url
  };
  return (dispatch) => {
    requestWithPayload(requestObject, callback)
    .then((res) => {
      const action = createActionWithPayload(actionName, key, res);
      dispatch(action);
      callback(url + '/' + res.id);
      dispatch(handleMessage('Successfully created ' + key + ': ' + res.id));
    })
    .catch((err) => {
      dispatch(handleError(err));
    });
  };
}

module.exports = {
  getActionAndKeyFromUrl, // exported for test
  hideError,
  hideMessage,
  handleError,
  handleMessage,
  deleteResource,
  postResource,
  putResource,
  fetchResources,
};

