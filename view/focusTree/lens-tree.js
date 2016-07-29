// TODO This file is only temporary--remove when lens installation is
//  implemented.
/**
 * view/focus/lens-tree.js
 */
const utils = require('./lensUtils-tree');
const NEG = -1;
const H_REDUCE = 80;
const W_REDUCE = 400;
const SEARCH_RESULT_ID_PFX = 'li@';
const MINIMUM_SEARCH_TERM_LENGTH = 2;

// TODO For now, "d3" is loaded in focus.jade... when lens installation is
//  implemented, each lens will be responsible for loading all its resources.

/*
 * Don't edit these DEFAULT_* constants here; use "configOverride" to override
 * defaults.
 */
const DEFAULT_DURATION = 750;

// TODO Ultimately these "configOverride" settings would be admin override of
//  default lens configuration stored within the lens installation itself but
//  for now we can just put them here.
const configOverride = {
  duration: 350,
};

/*
 * Lens config defaults. Admin may override these to customize the look and
 * feel of the lens (instance-wide).
 */
const conf = {
  duration: configOverride.duration === undefined ?
    DEFAULT_DURATION : configOverride.duration,
};

const TINY = 1e-6;
const CIRCLE_NO_FILL_COLOR = '#fff';
const CIRCLE_RADIUS = 5;
const LINE_WIDTH = '2px';
const FOUND_LINE_WIDTH = '4px';
const LABEL_OFFSET = 10;
const color = {
  Critical: d3.rgb('rgb(252, 13, 27)'), // eslint-disable-line no-undef
  Warning: d3.rgb('rgb(253, 153, 67)'), // eslint-disable-line no-undef
  Info: d3.rgb('rgb(52, 144, 156)'), // eslint-disable-line no-undef
  OK: d3.rgb('lightsteelblue'), // eslint-disable-line no-undef
  Invalid: d3.rgb('rgb(197, 197, 197)'), // eslint-disable-line no-undef
  Timeout: d3.rgb('rgb(197, 197, 197)'), // eslint-disable-line no-undef
};
let hierarchy = {};
let width = document.documentElement.clientWidth - W_REDUCE;
let height = document.documentElement.clientHeight - H_REDUCE;
let searchableNodes = [];
let searchable = [];
let root;
const tree = d3 // eslint-disable-line no-undef
.layout.tree().size([height, width])
.sort(utils.nameAscending);
const diagonal = d3 // eslint-disable-line no-undef
.svg.diagonal().projection((d) => [d.y, d.x]);
const svg = d3 // eslint-disable-line no-undef
.select(utils.selector).append('svg')
.attr('width', width)
.attr('height', height)
.append('g');

// TODO the following "ignoreSample" function is only temporary--remove it
//  once we are streaming only the appropriate events to each client.

/**
 * Returns true if this perspective should just ignore this sample.
 *
 * @param {String} name - sample's name
 * @returns {Boolean} true if this perspective should ignore this sample
 */
function ignoreSample(name) {
  return name.indexOf(root.absolutePath) !== 0;
} // ignoreSample

// TODO the following "ignoreSubject" function is only temporary--remove it
//  once we are streaming only the appropriate events to each client.

/**
 * Returns true if this perspective should just ignore this subject.
 *
 * @param {String} absolutePath - subject's absolutePath
 * @returns {Boolean} true if this perspective should ignore this sample
 */
function ignoreSubject(absolutePath) {
  return absolutePath.indexOf(root.absolutePath) !== 0;
} // ignoreSubject

/**
 * Update a sample in the hierarchy.
 *
 * @param {Object} updatedNode - the new updated node
 */
function updateSampleInHierarchy(updatedNode) {
  /**
   * Recursively search the hierarchy for this node and update it.
   *
   * @param {String} key - the key to find
   * @param {Object} hier - the hierarchy to find it in
   * @param {Object} replaceWith - the replacement
   */
  function upd(key, hier, replaceWith) {
    if ((hier.absolutePath && hier.absolutePath === key) ||
      (hier.name && hier.name === key)) {
      // Update the reference in place.
      hier = replaceWith; // eslint-disable-line no-param-reassign
      return;
    }

    if (hier.samples) {
      const foundIdx = hier.samples.findIndex((s) => s.name = key);
      if (foundIdx >= 0) {
        hier.samples[foundIdx] = replaceWith;
        return;
      }
    }

    if (hier.children) {
      let found = hier.children.find((kid) => kid.absolutePath === key);
      if (found) {
        found = replaceWith;
        return;
      }

      hier.children.forEach((kid) => {
        upd(key, kid, replaceWith);
      });
    }
  } // upd

  upd(updatedNode.absolutePath || updatedNode.name,
    hierarchy, updatedNode);
} //  updateSampleInHierarchy

/**
 * Update a subject in the hierarchy.
 *
 * @param {Object} updatedNode - the new updated node
 */
function updateSubjectInHierarchy(updatedNode) {
  // TODO
} // updateSubjectInHierarchy

/**
 * Add a sample to the hierarchy.
 *
 * @param {Object} sampleToAdd - the new sample
 */
function addSampleToHierarchy(sampleToAdd) {
  /**
   * Recursively search the hierarchy for the subject to add this to, then add
   * it.
   *
   * @param {String} subjAbsPath - the subject absolutePath to add this to
   * @param {Object} sample - the sample to add
   * @param {Object} hier - the hierarchy
   */
  function add(subjAbsPath, sample, hier) {
    if (hier.absolutePath === subjAbsPath) {
      if (!hier.samples) {
        hier.samples = {};
      }

      hier.samples[sample.name] = sample;
    } else if (hier.children) {
      hier.children.forEach((kid) => {
        add(subjAbsPath, sample, kid);
      });
    }
  } // add

  const insertionPoint = utils.getParentAbsolutePath(sampleToAdd.name);
  if (insertionPoint) {
    add(insertionPoint, sampleToAdd, hierarchy);
  }
} // addSampleToHierarchy

/**
 * Add a subject to the hierarchy.
 *
 * @param {Object} subjectToAdd - the new subject
 */
function addSubjectToHierarchy(subjectToAdd) {
  /**
   * Recursively search the hierarchy for the parent subject to add this to,
   * then add it.
   *
   * @param {String} parentAbsPath - the subject absolutePath to add this to
   * @param {Object} subj - the subject to add
   * @param {Object} hier - the hierarchy
   */
  function add(parentAbsPath, subj, hier) {
    if (hier.absolutePath === parentAbsPath) {
      if (!hier.children) {
        hier.children = [];
      }

      hier.children.push(subj);
    } else if (hier.children) {
      hier.children.forEach((kid) => {
        add(parentAbsPath, subj, kid);
      });
    }
  } // add

  const insertionPoint =
    utils.getParentAbsolutePath(subjectToAdd.absolutePath);
  if (insertionPoint) {
    add(insertionPoint, subjectToAdd, hierarchy);
  }
} // addSubjectToHierarchy

/**
 * Remove the sample from the hierarchy.
 *
 * @param {String} sampleName - the sample name
 */
function removeSampleFromHierarchy(sampleName) {
  /**
   * Recursively search the hierarchy for this node and delete it.
   *
   * @param {String} key - the sample name to find and delete
   * @param {Object} hier - the hierarchy
   */
  function del(key, hier) {
    if (hier.samples && hier.samples[key]) {
      delete hier.samples[key];
    } else if (hier.children) {
      hier.children.forEach((kid) => {
        del(key, kid);
      });
    }
  } // del

  del(sampleName, hierarchy);
} // removeSampleFromHierarchy

/**
 * Remove the subject from the hierarchy.
 *
 * @param {String} absolutePath - the subject absolutePath
 */
function removeSubjectFromHierarchy(absolutePath) {
  /**
   * Recursively search the hierarchy for this node and delete it.
   *
   * @param {String} key - the subject absolutePath to find and delete
   * @param {Object} hier - the hierarchy
   */
  function del(key, hier) {
    if (hier.absolutePath === key) {
      hier = {}; // eslint-disable-line no-param-reassign
    } else if (hier.children) {
      const foundIdx = hier.children.findIndex((kid) =>
        kid.absolutePath === key);
      if (foundIdx >= 0) {
        hier.children.splice(foundIdx, 1);
      } else {
        hier.children.forEach((kid) => {
          del(key, kid);
        });
      }
    }
  } // del

  del(absolutePath, hierarchy);
} // removeSubjectFromHierarchy

function setDetails(d) {
  // First clear details
  const panelContents = document.getElementById('detailsPanel');
  while (panelContents.firstChild) {
    panelContents.removeChild(panelContents.firstChild);
  }
  // Now set details
  const h1 = document.createElement('h1');
  h1.appendChild(document.createTextNode(
    d.absolutePath ? d.absolutePath : d.name));
  panelContents.appendChild(h1);
  const pdesc = document.createElement('p');
  pdesc.innerHTML = d.description || '';
  panelContents.appendChild(pdesc);
} // setDetails

function setDetailsPanelSizes() {
  document.getElementById('searchInput').setAttribute('style',
    'left: ' + (width + 70) + 'px; ' +
    'top: 24px;');
  document.getElementById('searchResults').setAttribute('style',
    'left: ' + (width + 70) + 'px; ' +
    'top: 40px; ' +
    'width: ' + (W_REDUCE - 90) + 'px; ' +
    'height: ' + ((height / 3)) + 'px;');
  document.getElementById('detailsPanel').setAttribute('style',
    'left: ' + (width + 70) + 'px; ' +
    'top: ' + ((height / 2) + 48) + 'px; ' +
    'width: ' + (W_REDUCE - 90) + 'px; ' +
    'height: ' + ((2 * height / 3) - 36) + 'px;');
} // setDetailsPanelSizes

function toggle(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
} // toggle

// Clear found, set details, toggle expand/collapse.
function click(d) {
  clearAll(root);
  setDetails(d);
  toggle(d);
  update(d); // eslint-disable-line no-use-before-define
} // click

function update(source) {
  // Compute the new tree layout.
  const nodes = tree.nodes(root).reverse();
  const links = tree.links(nodes);
  let maxDepth = 0;

  nodes.forEach((d) => {
    if (d.depth > maxDepth) {
      maxDepth = d.depth;
    }
  });
  maxDepth++;

  nodes.forEach((d) => {
    d.y = d.depth * width / maxDepth;
  });

  // Update the nodes
  const node = svg.selectAll('g.node')
  .data(nodes, (d) => d.id);

  // Enter any new nodes at the parent's previous position.
  const nodeEnter = node.enter().append('g')
  .attr('class', 'node')
  .attr('id', (d) => d.id)
  .attr('transform', () => {
    if (source.x0 >= 0 && source.y0 >= 0) {
      return 'translate(' + source.y0 + ',' + source.x0 + ')';
    }
  })
  .on('click', click);

  nodeEnter.append('circle')
  .attr('r', TINY)
  .style('fill', (d) =>
    (d._children && d._children.length > 0) ?
    color[d.status] : CIRCLE_NO_FILL_COLOR);

  nodeEnter.append('text')
  .attr('x', (d) => {
    if (d.depth === 0) {
      return -CIRCLE_RADIUS;
    }

    return d.aspect ? LABEL_OFFSET : -LABEL_OFFSET;
  })
  .attr('dy', (d) => d.depth === 0 ? '-' + LABEL_OFFSET + 'px' : '.35em')
  .style('font-weight', (d) => d.class === 'found' ? 'bold' : 'normal')
  .attr('text-anchor', (d) => {
    if (d.depth === 0) {
      return 'start';
    }

    return (d.aspect ? 'start' : 'end');
  })
  .text((d) => d.absolutePath ? d.name : d.aspect.name)
  .style('fill-opacity', TINY);

  // Transition nodes to their new position.
  const nodeUpdate = node.transition()
  .duration(conf.duration)
  .attr('transform', (d) => 'translate(' + d.y + ',' + d.x + ')');

  nodeUpdate.select('circle')
  .attr('r', CIRCLE_RADIUS)
  .style('fill', (d) => (d._children && d._children.length > 0) ?
    color[d.status] : CIRCLE_NO_FILL_COLOR)
  .style('stroke', (d) => color[d.status])
  .style('stroke-width', (d) =>
    d.class === 'found' ? FOUND_LINE_WIDTH : LINE_WIDTH);

  nodeUpdate.select('text')
  .style('fill-opacity', 1)
  .style('font-weight', (d) => d.class === 'found' ? 'bold' : 'normal');

  // Transition exiting nodes to the parent's new position.
  const nodeExit = node.exit().transition().duration(conf.duration)
  .attr('transform', () => 'translate(' + source.y + ',' + source.x + ')')
  .remove();

  nodeExit.select('circle')
  .attr('r', TINY);

  nodeExit.select('text')
  .style('fill-opacity', TINY);

  // Update the links
  const link = svg.selectAll('path.link')
  .data(links, (d) => d.target.id);

  // Enter any new links at the parent's previous position.
  link.enter().insert('path', 'g')
  .attr('class', 'link')
  .attr('d', () => {
    if (source.x0 >= 0 && source.y0 >= 0) {
      const o = { x: source.x0, y: source.y0 };
      return diagonal({ source: o, target: o });
    }
  });

  // Transition links to their new position.
  link.transition().duration(conf.duration)
  .attr('d', diagonal)
  .style('stroke-width', (d) =>
    (d.source.class === 'found' && d.target.class === 'found') ?
    FOUND_LINE_WIDTH : LINE_WIDTH);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition().duration(conf.duration)
  .attr('d', () => {
    const o = { x: source.x, y: source.y };
    return diagonal({ source: o, target: o });
  })
  .remove();

  // Stash the old positions for transition.
  nodes.forEach((d) => {
    d.x0 = d.x;
    d.y0 = d.y;
  });
} // update

function collapse(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
} // collapse

function expand(d) {
  if (d._children) {
    d.children = d._children;
    d._children = null;
  }
} // expand

/**
 * The main function for the initial rendering of this lens.
 *
 * @param {Subject} hier - The root Subject element of the hierarchy to
 *  render
 */
function renderLens(hier) {
  hierarchy = JSON.parse(JSON.stringify(hier)); // a copy
  root = utils.childrenize(utils.prepareHierarchyData(hier));
  root.x0 = height / 2;
  root.y0 = 0;
  searchableNodes = tree.nodes(root);
  searchable = searchableNodes.map((n) => {
    return {
      key: n.id,
      value: n.absolutePath || n.name,
    };
  });
  root.children.forEach(collapse);
  update(root);
} // renderLens

function clearAll(d) {
  d.class = '';
  if (d.children) {
    d.children.forEach(clearAll);
  } else if (d._children) {
    d._children.forEach(clearAll);
  }
} // clearAll

function show(evt) {
  if (!evt.target.id) {
    return;
  }

  const tid = evt.target.id.substring(SEARCH_RESULT_ID_PFX.length);
  const found = searchableNodes.find((n) => {
    if (n.id === tid) {
      return n;
    }
  });
  if (found) {
    clearAll(root);
    found.class = 'found';
    if (root.children) {
      root.children.forEach(collapse);
    }
    update(root);
    const ancestry = [];
    let par = found.parent;
    while (par) {
      par.class = 'found';
      ancestry.push(par);
      par = par.parent;
    }

    ancestry.forEach(expand);
    setDetails(found);
    toggle(found);
    update(found);
  }
} // show

function search() {
  const sr = document.getElementById('searchResults');
  const term = document.getElementById('searchInput').value.toLowerCase();

  while (sr.firstChild) {
    sr.removeChild(sr.firstChild);
  }

  function found(s) {
    return s.value.toLowerCase().indexOf(term) > NEG;
  }

  if (term.length >= MINIMUM_SEARCH_TERM_LENGTH) {
    searchable.filter(found).forEach((s) => {
      const li = document.createElement('li');
      const displayVal = s.value.replace(root.absolutePath + '.', '');
      li.setAttribute('id', SEARCH_RESULT_ID_PFX + s.key);
      li.appendChild(document.createTextNode(displayVal));
      li.addEventListener('click', show);
      sr.appendChild(li);
    });
  }
} // search

/*
 * Handle the load event.
 */
utils.element.addEventListener(utils.evt.load, () => {
  utils.addStylesheet('./focusTree/lens-tree.css');

  // Set up the search panel
  const searchPanel = document.createElement('div');
  searchPanel.setAttribute('id', 'searchPanel');
  const searchInput = document.createElement('input');
  searchInput.setAttribute('id', 'searchInput');
  searchInput.setAttribute('type', 'text');
  searchInput.setAttribute('placeholder', 'Search...');
  searchInput.addEventListener('keyup', search);
  utils.element.appendChild(searchInput);
  const searchResults = document.createElement('ol');
  searchResults.setAttribute('id', 'searchResults');
  utils.element.appendChild(searchResults);

  // Set up the details panel
  const detailsPanel = document.createElement('div');
  detailsPanel.setAttribute('id', 'detailsPanel');
  utils.element.appendChild(detailsPanel);
  setDetailsPanelSizes();

  // TODO register window event listeners here!
}); // "load" event listener

/*
 * Handle the hierarchyLoad event.
 */
utils.element.addEventListener(utils.evt.hierarchyLoad, (evt) => {
  renderLens(evt.detail);

  // TODO register sample and subject event listeners here!
}); // "hierarchyLoad" event listener
