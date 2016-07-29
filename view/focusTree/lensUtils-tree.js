/**
 * view/focus/lensUtils-tree.js
 */
const LENS_SELECTOR_ID = 'lens';
const ONE = 1;
const ABS_PATH_SEP = '.';
const ABS_PATH_OR_NAME_SEP = /[.|]/;
const statuses = {
  Critical: 'Critical',
  Invalid: 'Invalid',
  Timeout: 'Timeout',
  Warning: 'Warning',
  Info: 'Info',
  OK: 'OK',
};
function moreSevere(a, b) {
  if (statuses[a] === undefined || statuses[b] === undefined) {
    return statuses.Invalid;
  }

  const vals = {
    Critical: 0,
    Invalid: 1,
    Timeout: 2,
    Warning: 3,
    Info: 4,
    OK: 5,
  };
  return vals[a] < vals[b] ? a : b;
}

/**
 * Recursive function rolls up the severest status to parent and renames
 * sample's "value" attribute to "sampleValue" since d3 "partition" assigns
 * its own attribute named "value".
 *
 * @param {Object} n - A node in the subject hierarchy
 * @returns {Object} - the updated subject hierarchy
 */
function prepareHierarchyData(n) { // eslint-disable-line max-statements
  if (n.status === undefined) {
    n.status = statuses.OK;
  }

  if (n.children) {
    const kids = [];
    n.children.forEach((kid) => {
      const k = prepareHierarchyData(kid);
      kids.push(k);
      n.status = moreSevere(n.status, k.status);
    });
    n.children = kids;
  }

  if (n.samples) {
    const samples = {};
    const sampleKeys = Object.keys(n.samples);
    for (let j = 0; j < sampleKeys.length; j++) {
      n.status = moreSevere(n.status, n.samples[sampleKeys[j]].status);
      samples[sampleKeys[j]] = n.samples[sampleKeys[j]];
      samples[sampleKeys[j]].sampleValue = samples[sampleKeys[j]].value;
    }

    n.samples = samples;
  }

  return n;
} // prepareHierarchyData

function childrenize(n) {
  if (n.children) {
    n.children.forEach(childrenize);
  } else {
    n.children = [];
  }

  if (n.samples && typeof n.samples === 'object') {
    const sampleKeys = Object.keys(n.samples);
    for (let i = 0; i < sampleKeys.length; i++) {
      n.children.push(n.samples[sampleKeys[i]]);
    }
  }

  return n;
}

/*
 * The "utils" object is a container for some constants and utility
 * functions which lenses might find useful.
 */
const utils = {

  /*
   * Allows a lens implementation to access the document element inside of
   * which all the lens content will be rendered.
   */
  element: document.getElementById(LENS_SELECTOR_ID),

  evt: {
    hierarchyLoad: 'refocus.lens.hierarchyLoad',
    load: 'refocus.lens.load',
    samp: {
      add: 'refocus.internal.realtime.sample.add',
      rem: 'refocus.internal.realtime.sample.remove',
      upd: 'refocus.internal.realtime.sample.update',
    },
    subj: {
      add: 'refocus.internal.realtime.subject.add',
      rem: 'refocus.internal.realtime.subject.remove',
      upd: 'refocus.internal.realtime.subject.update',
    },
  }, // evt

  /*
   * Allows a lens implementation to access the selector of the document
   * element inside of which all the lens content will be rendered.
   */
  selector: '#' + LENS_SELECTOR_ID,

  /*
   * Allows a lens implementation to access the selector id of the document
   * element inside of which all the lens content will be rendered.
   */
  selectorId: LENS_SELECTOR_ID,

  statuses,

  moreSevere,

  /**
   * Allows a lens implementation to insert one or more stylesheets into the
   * DOM.
   *
   * @param {String|Array} relativePaths - relative to the perspective page
   */
  addStylesheet(relativePaths) {
    const paths = Array.isArray(relativePaths) ? relativePaths :
      [relativePaths];
    for (let i = 0; i < paths.length; i++) {
      const link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('type', 'text/css');
      link.setAttribute('href', paths[i]);
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, // addStylesheet

  /**
   * Returns the absolutePath of the parent of the subject or sample
   * represented by the specified key.
   *
   * @param {String} key - subject.absolutePath or sample.name
   * @returns {String} - the absolutePath of the parent
   */
  getParentAbsolutePath(key) {
    const arr = key.split(ABS_PATH_OR_NAME_SEP);
    arr.pop();
    return arr.join(ABS_PATH_SEP);
  }, // getParentAbsolutePath

  /**
   * Use this as the d3.partition children accessor function. It will return
   * an array of the subject's children and samples. It expects "children" to
   * be an array and "samples" to be an object.
   *
   * @param {Object} n - node
   * @returns {Array} - the node's children and samples
   */
  nodeChildren(n) {
    const retval = n.children || [];
    if (n.samples && typeof n.samples === 'object') {
      const keys = Object.keys(n.samples);
      for (let i = 0; i < keys.length; i++) {
        retval.push(n.samples[keys[i]]);
      }
    }

    return retval;
  }, // nodeChildren

  /**
   * Use this as the d3.partition sort comparator function. It will sort by
   * subject or sample name in ascending order, case-insensitive.
   *
   * @param {Object} a - the first node to compare
   * @param {Object} b - the second node to compare
   * @returns {Integer} - positive integer if a > b, negative integer if
   *  a < b, 0 if a === b
   */
  nameAscending(a, b) {
    if (a && a.name && b && b.name) {
      if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return ONE;
      } else if (a.name.toLowerCase() < b.name.toLowerCase()) {
        return -ONE;
      }
    }

    return 0;
  }, // nameAscending

  prepareHierarchyData,
  childrenize,

}; // utils

module.exports = utils;
