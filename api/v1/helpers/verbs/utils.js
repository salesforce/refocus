/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/utils.js
 */
'use strict';

const NOT_FOUND = -1;
const apiErrors = require('../../apiErrors');
const constants = require('../../constants');
const commonDbUtil = require('../../../../db/helpers/common');

/**
 * This functions adds the association scope name to the as the to all
 * the elements of the associaton array
 * @param {Array} assocArry -  The array of association objects that are
 * to be created
 * @param {Module} props - The module containing the properties of the
 *  resource type to post
 */
function addAssociationScope(assocArry, props) {
  assocArry.map((o) =>
    o.associatedModelName = props.modelName
  );
} // addAssociationScope

/**
 * This function adds the associated models to be created to the include
 * array, which is used while creating the primary model. It also adds
 * the asoociation scope name to the elements of associated array if any.
 * @param  {Object} obj - value field of the request object containing the
 * entity that is to be created
 * @param {Module} props - The module containing the properties of the
 *  resource type to post
 * @returns {Object} - Object with the associated models to be created, added to
 * the include array
 */
function includeAssocToCreate(obj, props) {
  const includedAssoc = { include: [] };
  const getAssocfuncName = `get${props.modelName}Associations`;
  for (const key in obj) {
    if (key && Array.isArray(obj[key]) && props.assocSet &&
           props.assocSet.has(key)) {
      // add the associated model to the include array
      includedAssoc.include.push(props.model[getAssocfuncName]()[key]);

      // add the association scope name to the elements of association array
      addAssociationScope(obj[key], props);
    }
  }

  return includedAssoc;
} // includeAssocToCreate

/**
 * Function that capitalises the first letter of the string and returns it.
 * @param  {String} str - String that has to have its first letter capitalized
 * @returns {String} str - String with the first letter capitalized
 */
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
} // capitalizeFirstLetter

/**
 * This function updates or creates the associated models of an instance.
 *
 * @param  {Object} reqObj - The request body object
 * @param  {Model} inst - A model instance that has to have its associated
 *  model object updated or created
 * @param {Module} props - The module containing the properties of the
 *  resource type to be patched
 * @returns {Promise} which resolves to an object with the associated model
 *  object patched if any.
 */
function handleAssociations(reqObj, inst, props, method) {
  return new Promise((resolve, reject) => {
    if (props.assocSet) {
      const promises = Array.from(props.assocSet).map((element) =>
        new Promise((_resolve, _reject) => {
          if (Array.isArray(reqObj[element]) && reqObj[element].length > 0) {
            const functionName = `handle${capitalizeFirstLetter(element)}`;

            /**
             * all the functions that upsert associated models are named
             * handle{associateionName}. So, here we are getting the name of the
             * function to upsert the association.
             */
            commonDbUtil[functionName](inst, reqObj[element], method)
            .then((retValue) => {
              inst.dataValues[element] = retValue;
              return inst;
            })
            .then((o) => _resolve(o))
            .catch((err) => _reject(err));
          } else if (Array.isArray(reqObj[element]) &&
            reqObj[element].length === 0 &&
            (/put/i).test(method)) {
            const getAssocfuncName = `get${capitalizeFirstLetter(element)}`;
            inst[getAssocfuncName]()
            .then((assocObjs) => {
              assocObjs.forEach((obj) => {
                obj.destroy();
              });
              _resolve(inst);
            })
            .catch((err) => _reject(err));
          } else {
            _resolve(inst);
          }
        })
      );
      Promise.all(promises)
      .then((instArr) => resolve(instArr[instArr.length - 1]))
      .catch((err) => reject(err));
    } else {
      return resolve(inst);
    }
  });
} // handleAssociations

/**
 * Generates sequelize options object with all the appropriate attributes
 * (fields) and includes, and taking virtual fields into account as well.
 *
 * @param {Object} params - The request parameters
 * @returns {Object} - Sequelize options
 */
function buildFieldList(params) {
  const opts = {};
  if (params.fields && params.fields.value) {
    opts.attributes = params.fields.value;
  }

  return opts;
} // buildFieldList

/**
 * Builds the API links to send back in the response.
 *
 * @param {String} key - The record id or name (or subject.absolutePath)
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {String} method - The method name
 * @returns {Object} the API links to send back in the response
 */
function getApiLinks(key, props, method) {
  // If this was a DELETE method, only include a POST link...
  if (/delete/i.test(method) && !props.association) {
    return [
      {
        href: props.baseUrl,
        method: 'POST',
        rel: props.apiLinks.POST,
      },
    ];
  }

  // Otherwise include all the methods specified for this resource
  return Object.keys(props.apiLinks).map((i) => {
    return {
      href: i === 'POST' ?
        props.baseUrl :
        props.baseUrl + constants.SLASH + key,
      method: i,
      rel: props.apiLinks[i],
    };
  });
} // getApiLinks

/**
 * Performs a regex test on the key to determine whether it looks like a
 * postgres uuid. This helps us determine whether to try finding a record by
 * id first then failing over to searching by name, or if the key doesn't meet
 * the criteria to be a postgres uuid, just skip straight to searching by name.
 *
 * @param {String} key - The key to test
 * @returns {Boolean} - True if the key looks like an id
 */
function looksLikeId(key) {
  return constants.POSTGRES_UUID_RE.test(key);
}

/**
 * Tries to find the specified record by name (or subject.absolutePath).
 *
 * @param {Model} model - The DB model being searched
 * @param {String} key - The name (or subject.absolutePath) to search for
 * @param {Object} opts - The Sequelize options to send with the find
 *  operation
 * @returns {Promise} which resolves to the record found, or rejects with
 *  ResourceNotFoundError if record not found
 */
function findByName(model, key, opts) {
  return new Promise((resolve, reject) => {
    model.findOne(opts)
    .then((o) => {
      if (o) {
        resolve(o);
      } else {
        const err = new apiErrors.ResourceNotFoundError();
        err.resource = model.name;
        err.key = key;
        throw err;
      }
    })
    .catch((err) => reject(err));
  });
} // findByName

/**
 * Tries calling findById but falls back to findByName (or
 * subject.absolutePath) if no record is found by id.
 *
 * @param {Model} model - The DB model being searched
 * @param {String} key - The id or name to search for
 * @param {Object} opts - The Sequelize options to send with the find
 *  operation
 * @returns {Promise} which resolves to the record found, or rejects with
 *  ResourceNotFoundError if record not found
 */
function findByIdThenName(model, key, opts) {
  return new Promise((resolve, reject) => {
    const wh = opts.where;
    delete opts.where;
    model.findById(key, opts)
    .then((found) => found)
    .catch(() => {
      opts.where = wh;
      return findByName(model, key, opts);
    })
    .then((o) => {
      if (o) {
        resolve(o);
      } else {
        const err = new apiErrors.ResourceNotFoundError();
        err.resource = model.name;
        err.key = key;
        throw err;
      }
    })
    .catch((err) => reject(err));
  });
} // findByIdThenName

/**
 * Duplicate elements in an Array of strings are removed and the request object
 * is returned.
 * @param  {Object} requestBody  - The request object
 * @param  {Object} props - The helpers/nouns module for the given DB model
 * @returns {Object} the updated object with the duplicate elements in the array
 * removed.
 */
function mergeDuplicateArrayElements(requestBody, props) {
  if (props.fieldsWithArrayType) {
    props.fieldsWithArrayType.forEach((field) => {
      if (requestBody[field]) {
        const aSet = new Set(requestBody[field]);
        requestBody[field] = Array.from(aSet);
      }
    });
  }

  return requestBody;
}

/**
 * All the array fields of the requestBody are compared with the
 * same fields of the model and a merge is performed to update the requestBody
 * @param  {Model} instance - A model instance which needs to be patched
 * @param  {Object} requestBody  - The request object
 * @param  {Object} props - The helpers/nouns module for the given DB model
 * @returns {Object} the updated object with the array fields patched
 */
function patchArrayFields(instance, requestBody, props) {
  if (props.fieldsWithArrayType) {
    props.fieldsWithArrayType.forEach((field) => {
      if (requestBody[field]) {
        const instSet = new Set(instance.dataValues[field]);
        requestBody[field].forEach((element) => {
          instSet.add(element);
        });
        requestBody[field] = Array.from(instSet);
      }
    });
  }

  return requestBody;
} // patchArrayFields

/**
 * Deletes a string in the array that matches 'elementName'
 * @param  {Array} arr - Array of string.
 * @param  {String} elementName  - The element in the array to be deleted.
 * @returns {Array} - An array without an 'elementName' string in it
 */
function deleteArrayElement(arr, elementName) {
  let updatedArr;
  if (arr !== null) {
    updatedArr = arr.filter((element) => element !== elementName);
  }

  return updatedArr;
} // deleteArrayElement

/**
 * Compares the json objects in the instArray with the requestArray and performs
 * a merge.
 * @param  {[Array]} instArray - Array of Json objects from the model instance
 * @param  {[Array]} requestArray  - Array of Json objects from the request body
 * @returns {[Array]} - Merged array that will be finally persisted in the model
 */
function mergeByProperty(instArray, requestArray) {
  const negativeOne = -1;
  const retArray = instArray.slice();
  requestArray.forEach((destElement) => {
    const index = instArray.findIndex((instElement) =>
     instElement.name === destElement.name);
    if (index > negativeOne) {
      retArray[index] = destElement;
    } else {
      retArray.push(destElement);
    }
  });
  return retArray;
}

/**
 * All the JSON array fields of the requestBody are compared with the
 * same fields of the model and a merge is performed to update the requestBody
 * @param  {Model} instance - A model instance which needs to be patched
 * @param  {Object} requestBody  - The request body object
 * @param  {Object} props - The helpers/nouns module for the given DB model
 * @returns {Object} the updated model with the json array fields patched
 */
function patchJsonArrayFields(instance, requestBody, props) {
  if (props.fieldsWithJsonArrayType) {
    props.fieldsWithJsonArrayType.forEach((field) => {
      if (requestBody[field]) {
        requestBody[field] =
          mergeByProperty(instance.dataValues[field], requestBody[field]);
      }
    });
  }

  return requestBody;
} // patchJsonArrayFields

/**
 * Given a json Array, the json object in the array that matches the elementName
 * is deleted(filtered) from the array.
 * @param  {Array} jsonArray - Array with json objects.
 * @param  {String} elementName  - The name of the json object in the array
 * that is to be deleted.
 * @returns {Array} - Json array with the json object matching the "elementName"
 *  removed from the array.
 */
function deleteAJsonArrayElement(jsonArray, elementName) {
  let updatedJson;
  if (jsonArray !== null) {
    updatedJson = jsonArray.filter((element) => element.name !== elementName);
  }

  return updatedJson;
} // deleteAJsonArrayElement

/**
 * Retrieves the appropriately-scoped model for the given DB model and the
 * list of fields requested.
 *
 * If a model specifies a "fieldAbsenceScopeMap" then apply the designated
 * scope if the mapped field is NOT in the list of fields to retrieve.
 * If the model does NOT specify a "fieldAbsenceScopeMap" then check for a
 * "fieldScopeMap" and apply the designated scope if the mapped field is
 * included in the list of fields to retrieve.
 *
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {Array} fields - The list of fields to return
 * @returns {Model} the appropriately-scoped model for the given DB model and
 *  the list of fields requested.
 */
function getScopedModel(props, fields) {
  const scopes = [];

  if (fields && Array.isArray(fields) && fields.length) {
    if (props.fieldAbsenceScopeMap) {
      const keys = Object.keys(props.fieldAbsenceScopeMap);
      for (let i = 0; i < keys.length; i++) {
        const fieldName = keys[i];
        if (fields.indexOf(fieldName) === NOT_FOUND) {
          const scopeName = props.fieldAbsenceScopeMap[fieldName];
          if (scopeName) {
            scopes.push(scopeName);
          }
        }
      }
    } else {
      scopes.push(constants.SEQ_DEFAULT_SCOPE);
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (props.fieldScopeMap && props.fieldScopeMap[f]) {
          scopes.push(props.fieldScopeMap[f]);
        }
      }
    }

    if (scopes.length) {
      return props.model.scope(scopes);
    }
  }

  return props.model;
} // getScopedModel

/**
 * Recursively cleans the object (i.e. calls "get" on any sequelize
 * instances), strips out nulls (because swagger validation doesn't like
 * nulls).
 *
 * @param {Object} obj - The object to clean
 * @returns {Object} - The cleaned object
 */
function cleanAndStripNulls(obj) {
  const o = obj.get ? obj.get({ plain: true }) : obj;
  if (o) {
    const keys = Object.keys(o);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      // if undefined, parentAbsolutePath needs to be set to empty string,
      // to pass swagger's schema validation
      if (key == 'parentAbsolutePath' && !o[key]) {
        o[key] = '';
      } else if (o[key] === undefined || o[key] === null) {
        delete o[key];
      } else if (Array.isArray(o[key])) {
        o[key] = o[key].map((i) => cleanAndStripNulls(i));
      } else if (typeof o[key] === 'object') {
        o[key] = cleanAndStripNulls(o[key]);
      }
    }
  }

  return o;
}

// ----------------------------------------------------------------------------

module.exports = {

  buildFieldList,

  /**
   * Prepares the object to be sent back in the response ("cleans" the object,
   * strips out nulls, adds API links).
   *
   * @param {Instance|Array} rec - The record or records to return in the
   *  response
   * @param {Object} props - The helpers/nouns module for the given DB model
   * @param {String} method - The request method, used to help build the API
   *  links
   * @returns {Object} the "responsified" cleaned up object to send back in
   *  the response
   */
  responsify(rec, props, method) {
    const o = cleanAndStripNulls(rec);
    o.apiLinks = getApiLinks(o.id, props, method);
    return o;
  }, // responsify

  /**
   * If the key looks like a postgres uuid, tries calling findById first, but
   * falls back to find by name (or subject.absolutePath) if none found. If
   * the key does not look like a postgres uuid, just tries to find by name
   * (or subject.absolutePath).
   *
   * @param {Object} props - The helpers/nouns module for the given DB model
   * @param {Object} params - The request params
   * @param {Array} extraAttributes - An array of... // TODO
   * @returns {Promise} which resolves to the record found, or rejects with
   *  ResourceNotFoundError if record not found
   */
  findByKey(props, params, extraAttributes) {
    const key = params.key.value;
    const opts = buildFieldList(params);
    const keyClause = {};
    keyClause[constants.SEQ_LIKE] = key;
    opts.where = {};
    opts.where[props.nameFinder || 'name'] = keyClause;
    const attrArr = [];
    if (opts.attributes && Array.isArray(opts.attributes)) {
      for (let i = 0; i < opts.attributes.length; i++) {
        attrArr.push(opts.attributes[i]);
      }
    }

    if (extraAttributes && Array.isArray(extraAttributes)) {
      for (let i = 0; i < extraAttributes.length; i++) {
        attrArr.push(extraAttributes[i]);
      }
    }

    const scopedModel = getScopedModel(props, attrArr);
    if (looksLikeId(key)) {
      return findByIdThenName(scopedModel, key, opts);
    }

    return findByName(scopedModel, key, opts);
  }, // findByKey

  getScopedModel,

  includeAssocToCreate,

  handleAssociations,

  deleteAJsonArrayElement,

  deleteArrayElement,

  mergeDuplicateArrayElements,

  /**
   * Attaches the resource type to the error and passes it on to the next
   * handler.
   *
   * @param {Function} next - The next middleware function in the stack
   * @param {Error} err - The error to handle
   * @param {String} modelName - The DB model name, used to disambiguate field
   *  names
   */
  handleError(next, err, modelName) {
    err.resource = modelName;
    next(err);
  },

  looksLikeId,

  cleanAndStripNulls,

  capitalizeFirstLetter,

  patchJsonArrayFields,

  patchArrayFields,

  getApiLinks,

}; // exports
