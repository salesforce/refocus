/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/utils.js
 */
'use strict';

const NOT_FOUND = -1;
const apiErrors = require('../../apiErrors');
const constants = require('../../constants');
const commonDbUtil = require('../../../../db/helpers/common');
const jwtUtil = require('../../../../utils/jwtUtil');
const common = require('../../../../utils/common');
const logAPI = require('../../../../utils/apiLog').logAPI;
const publisher = require('../../../../realtime/redisPublisher');
const realtimeEvents = require('../../../../realtime/constants').events;
const redisCache = require('../../../../cache/redisCache').client.cache;

/**
 * @param {Object} o Sequelize instance
 * @param {Object} puttableFields from API
 * @param {Object} toPut from request.body
 * @returns {Promise} the updated instance
 */
function updateInstance(o, puttableFields, toPut) {
  const keys = Object.keys(puttableFields);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (toPut[key] === undefined) {
      let nullish = null;
      if (puttableFields[key].type === 'boolean') {
        nullish = false;
      } else if (puttableFields[key].enum) {
        nullish = puttableFields[key].default;
      }

      o.set(key, nullish);

      // take nullified fields out of changed fields
      o.changed(key, false);
    } else {

      /*
       * value may have changed. set changed to true to
       * trigger checks in the model
       */
      o.changed(key, true);
      o.set(key, toPut[key]);
    }
  }

  return o.save();
}

/**
 * Sends the udpated record back in the json response
 * with status code 200.
 *
 * @param {Object} resultObj - For logging
 * @param {Object} req - The request object
 * @param {Object} retVal - The updated instance
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {Object} res - The response object
 * @returns {Object} JSON succcessful response
 */
function handleUpdatePromise(resultObj, req, retVal, props, res) {
  resultObj.dbTime = new Date() - resultObj.reqStartTime;
  logAPI(req, resultObj, retVal);

  // publish the update event to the redis channel
  if (props.publishEvents) {
    publisher.publishSample(
      retVal, props.associatedModels.subject, realtimeEvents.sample.upd);
  }

  // update the cache
  if (props.cacheEnabled) {
    const getCacheKey = req.swagger.params.key.value;
    const findCacheKey = '{"where":{}}';
    redisCache.del(getCacheKey);
    redisCache.del(findCacheKey);
  }

  return res.status(constants.httpStatus.OK)
    .json(responsify(retVal, props, req.method));
}

/**
 * In-place removal of certain keys from the input object
 *
 * @oaram {Array} fieldsArr The fields to remove from the following obj
 * @oaram {Object} responseObj The dataValues object, may have fields for removal
 * @oaram {Object} The input object without the keys in fieldsArr
 */
function removeFieldsFromResponse(fieldsToExclude, responseObj) {
  for (let i = fieldsToExclude.length - 1; i >= 0; i--) {
    delete responseObj[fieldsToExclude[i]];
  }
}

/**
 * This function adds the association scope name to the as the to all
 * the elements of the associaton array
 *
 * @param {Array} associations -  The array of association objects that are
 *  to be created
 * @param {Object} props - The module containing the properties of the
 *  resource type to post
 */
function addAssociationScope(associations, props) {
  associations.map((o) => {
    o.associatedModelName = props.modelName;
  });
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
 * Capitalize the first letter of the string and returns the modified string.
 *
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
             * handle{associationName}. So, here we are getting the name of the
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
 * Always include the "id" field even if it was not explicitly requested.
 *
 * @param {Object} params - The request parameters
 * @returns {Object} - Sequelize options
 */
function buildFieldList(params) {
  const opts = {};
  if (params.fields && params.fields.value) {
    opts.attributes = params.fields.value;
    if (!opts.attributes.includes('id')) {
      opts.attributes.push('id');
    }
  }

  return opts;
} // buildFieldList

/**
 * Checks if the model instance is writable by a user. The username is extracted
 * from the header if present, if not the user name of the logged in user is
 * used.
 * @param {Object} req  - The request object
 * @param {Object}  modelInst - DB Model instance
 * @returns {Promise} - A promise which resolves to the modle instance when
 * the model instance is writable or rejects with a forbidden error
 */
function isWritable(req, modelInst) {
  return new Promise((resolve, reject) => {
    if (typeof modelInst.isWritableBy !== 'function') {
      resolve(modelInst);
    }

    if (req.headers && req.headers.authorization) {
      jwtUtil.getTokenDetailsFromRequest(req)
      .then((resObj) => modelInst.isWritableBy(resObj.username))
      .then((ok) => ok ? resolve(modelInst) :
        reject(new apiErrors.ForbiddenError(
          'Resource not writable for provided token'))
      )
      .catch(reject);
    } else if (req.user) {
      // try to use the logged-in user
      modelInst.isWritableBy(req.user.name)
      .then((ok) => ok ? resolve(modelInst) :
        reject(new apiErrors.ForbiddenError(
          'Resource not writable by this user'))
      )
      .catch(reject);
    } else {
      // check if isWritable with no user
      // when not passed a user, isWritable will return true if
      // the resource is not write protected, false if it is
      modelInst.isWritableBy()
      .then((ok) => ok ? resolve(modelInst) :
        reject(new apiErrors.ForbiddenError('Resource is write protected'))
      )
      .catch(reject);
    }
  });
}

/**
 * This is a wrapper for the function with the same name in jwtUtil.
 * @param  {Object} req  - The request object
 * @param  {Boolean} doDecode - A flag to decide if the username has to be coded
 * from the token.
 * @returns {Promise} - A promise object which resolves to a username if the
 * doDecode flag is set
 */
function getUserNameFromToken(req) {
  return new Promise((resolve, reject) => {
    if (req.headers && req.headers.authorization) {
      jwtUtil.getTokenDetailsFromRequest(req)
      .then((resObj) => {
        resolve(resObj.username);
      })
      .catch((err) => reject(err));
    } else if (req.user) {
      // try to use the logged-in user
      resolve(req.user.name);
    } else {
      resolve(false);
    }
  });
} // getUserNameFromToken

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
  return Object.keys(props.apiLinks).map((i) => ({
    href: i === 'POST' ? props.baseUrl : props.baseUrl + constants.SLASH + key,
    method: i,
    rel: props.apiLinks[i],
  }));
} // getApiLinks

/**
 * Returns a where clause object that can be used to query the model.
 * @param  {String} nameOrId - Name or id of the record that the where clause
 * has to find
 * @returns {Object} - A where clause object
 */
function whereClauseForNameOrId(nameOrId) {
  const whr = {};
  if (common.looksLikeId(nameOrId)) {
    whr.id = nameOrId;
  } else {
    whr.name = nameOrId;
  }

  return whr;
} // whereClauseForNameOrId

/**
 * Returns a where clause object that uses the "IN" operator
 * @param  {Array} arr - An array that needs to be assigned to the "IN" operator
 * @returns {Object} - An where clause object
 */
function whereClauseForNameInArr(arr) {
  const whr = {};
  whr.name = {};
  whr.name[constants.SEQ_IN] = arr;
  return whr;
} // whereClauseForNameInArr

/**
 * A function that throws resource not found error if an array passed
 * to the function is empty
 * @param  {Array} arr  -  An array
 * @param  {String} key - Record id for which the error is thrown
 * @param  {String} modelName - Name of the model throwing the error
 */
function throwErrorForEmptyArray(arr, key, modelName) {
  if (Array.isArray(arr) && !arr.length) {
    const err = new apiErrors.ResourceNotFoundError();
    err.resource = modelName;
    err.key = key;
    throw err;
  }
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
      if (key === 'parentAbsolutePath' && !o[key]) {
        o[key] = '';
      } else if (key === 'parentId' && !o[key]) {
        o[key] = null;
      } else if (o[key] === undefined || o[key] === null) {
        delete o[key];
      } else if (Array.isArray(o[key])) {
        o[key] = o[key].map((j) => cleanAndStripNulls(j));
      } else if (typeof o[key] === 'object') {
        o[key] = cleanAndStripNulls(o[key]);
      }
    }
  }

  return o;
}

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
function findByKey(props, params, extraAttributes) {
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

  // If the key is a UUID then find the records by ID or name.
  // If the models key auto-increments then the key will be an
  // integer and still should find records by ID.
  if (common.looksLikeId(key)) {
    return findByIdThenName(scopedModel, key, opts);
  } else if ((typeof key === 'number') && (key % 1 === 0)) {
    return findByIdThenName(scopedModel, key, opts);
  }

  return findByName(scopedModel, key, opts);
} // findByKey

/**
 * Finds the associated instances of a given model
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {Object} params - The request params
 * @param  {String} association - Name of the associated model
 * @param  {[type]} options - An optional object to apply a "where" clause or
 * "scopes" to the associated model
 * @returns {Promise} which resolves to the associated record found or rejects
 * with ResourceNotFoundError if the given model(parent record) is not found.
 */
function findAssociatedInstances(props, params, association, options) {
  return new Promise((resolve, reject) => {
    findByKey(props, params)
    .then((o) => {
      if (o) {
        const getAssocfuncName = `get${capitalizeFirstLetter(association)}`;
        o[getAssocfuncName](options)
        .then((assocArry) => resolve(assocArry));
      }
    })
    .catch((err) => reject(err));
  });
}

/**
 * Deletes all the "belongs to many" associations of the model instance. The
 * assocNames contains the name of the associations that are to be deleted.
 * @param {Model} modelInst - The DB model instance that need to have all its
 *  association removed
 * @param {Array} assocNames - The name of the associations that are associated
 * with the model
 *
 */
function deleteAllAssociations(modelInst, assocNames) {
  let functionName;
  assocNames.forEach((assocName) => {
    functionName = `set${capitalizeFirstLetter(assocName)}`;

    // an empty array needs to be passed to the "setAssociations" function
    // to delete all the associations.
    modelInst[functionName]([]);
  });
} // deleteAllAssociations

/**
 * Attaches the resource type to the error and passes it on to the next
 * handler.
 *
 * @param {Function} next - The next middleware function in the stack
 * @param {Error} err - The error to handle
 * @param {String} modelName - The DB model name, used to disambiguate field
 *  names
 */
function handleError(next, err, modelName) {
  err.resource = modelName;
  next(err);
}

/**
 * Attaches the resource type to the error and passes it on to the next
 * handler.
 *
 * @param {Function} next - The next middleware function in the stack
 * @param {String} modelName - The DB model name, used to disambiguate field
 *  names
 */
function forbidden(next, modelName) {
  const err = new apiErrors.ForbiddenError({
    explanation: 'Forbidden.',
  });
  handleError(next, err, modelName);
} // forbidden

/**
 * Check if related links array have duplicate names.
 * @param  {Array}  rLinkArr - Array of related link objects
 * @throws {Error} If duplcate related link is found
 */
function checkDuplicateRLinks(rLinkArr) {
  const uniqlinks = [];
  rLinkArr.forEach((rLinkObj) => {
    if (rLinkObj.name && uniqlinks.includes(rLinkObj.name.toLowerCase())) {
      throw new apiErrors.ValidationError({
        explanation: 'Name of the relatedlinks should be unique.',
      });
    }

    uniqlinks.push(rLinkObj.name.toLowerCase());
  });
} // checkDuplicateRLinks

/**
 * Checks if the user has the permission to create the sample and creates the
 * sample if so.
 * @param  {Object} req  - The request object
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @returns {Promise}  which resolves to the created sample instance
 */
function createSample(req, props) {
  const toCreate = req.swagger.params.queryBody.value;
  const aspectModel = props.associatedModels.aspect;
  const options = {};
  options.where = whereClauseForNameOrId(toCreate.aspectId);
  let user;

  // get the user name from the request object
  return getUserNameFromToken(req)
  .then((usr) => {
    user = usr;

    // find the aspect related to the sample being created
    return aspectModel.findOne(options);
  })
  .then((aspect) => {
    if (!aspect) {
      throw new apiErrors.ResourceNotFoundError({
        explanation: 'Aspect not found.',
      });
    }

    // check if the user has permission to create the sample
    return aspect.isWritableBy(user);
  })
  .then((ok) => {
    if (!ok) {
      throw new apiErrors.ForbiddenError({
        explanation: `The user: ${user}, does not have write permission` +
            'on the sample',
      });
    }

    // create the sample if the user has write permission
    return props.model.create(toCreate);
  });
}

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
function responsify(rec, props, method) {
  const o = cleanAndStripNulls(rec);
  let key = o.id;

  // if do not return id, use name instead and delete id field
  if (props.fieldsToExclude && props.fieldsToExclude.indexOf('id') > -1) {
    key = o.name;
    delete o.id;
  }

  o.apiLinks = getApiLinks(key, props, method);
  if (props.stringify) {
    props.stringify.forEach((f) => {
      o[f] = `${o[f]}`;
    });
  }

  return o;
} // responsify

// ----------------------------------------------------------------------------

module.exports = {
  updateInstance,

  responsify,

  handleUpdatePromise,

  realtimeEvents,

  publisher,

  logAPI,

  buildFieldList,

  findAssociatedInstances,

  findByKey,

  forbidden,

  getScopedModel,

  includeAssocToCreate,

  isWritable,

  getUserNameFromToken,

  handleAssociations,

  deleteAJsonArrayElement,

  deleteArrayElement,

  mergeDuplicateArrayElements,

  handleError,

  deleteAllAssociations,

  looksLikeId: common.looksLikeId,

  whereClauseForNameOrId,

  whereClauseForNameInArr,

  throwErrorForEmptyArray,

  cleanAndStripNulls,

  capitalizeFirstLetter,

  patchJsonArrayFields,

  patchArrayFields,

  getApiLinks,

  removeFieldsFromResponse,

  checkDuplicateRLinks,

  createSample,

}; // exports
