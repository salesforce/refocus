// TODO This file is only temporary--remove when lens installation is
//  implemented.

// STILL TODO
// ------------------------------------------------------------------
// modal tags icon
// modal links icon
// Render the root node as designed

/**
 * view/focus/lens-rtBracket
 */
const utils = require('./lensUtils-rtBracket.js');

/*
 * Constants
 */
const TRANSPARENT = 'transparent';
const badStatuses = ['Critical', 'Invalid', 'Timeout', 'Warning', 'Info'];
const statuses = badStatuses.concat('OK');

/*
 * Page behavior settings
 */
const RENDER_LENS_LOOP_DELAY = 1000; // milliseconds
const DURATION_THRESHOLD = 300000; // milliseconds (5m)

/*
 * Lens animation settings
 */
const TRANSITION_DURATION = 1250;

/*
 * Lens display settings
 */
const ADJUST_HEIGHT = 60;
const ASPECT_NAME_CHARS = 8;
const CONNECTOR_CURVE = 7;
const SUBJECT_NAME_CHARS = 4;
const TOP_ADJUST = 10;
const VERTICAL_OFFSET_STEP = 1;
const VERTICAL_SPACING_DEFAULT_FACTOR = 2; // i.e. 2x node height
const VERTICAL_SPACING_MIN_FACTOR = 0.25; // i.e. 25% of node height
const NODE_HEIGHT = 26;
const styl = {
  bgcolor: '#1c1c1c',
  horizontalSpacing: {
    betweenSubjects: 40,
    betweenSubjectAndSample: 40,
    betweenSampleGroups: 2,
    connectorSplit: 0.25,
    shiftSampleGroupContainer: 75,
  },
  hoverTextColor: '#ffffff',
  pagehead: {
    height: 20,
    lastUpdate: {
      x: 17,
      y: 15,
    },
    pulse: {
      color: '#4ffd40',
      duration: 1000,
      minRadius: 2,
      maxRadius: 4,
      outerRadius: 5,
      rangePointsFactor: 10,
      x: 8,
      y: 10,
    },
    widthPadding: 50,
  },
  sample: {
    borderRadius: 2,
    textAnchor: 'start',
    textColor: '#ABABAB',
    textColorIsNew: '#00F4FF',
    textX: 8,
    width: 174,
  },
  statusColor: {
    Critical: '#FF0000',
    Warning: '#FF9A37',
    Info: '#329471',
    Timeout: '#9C60E8',
    Invalid: '#ABABAB',
  },
  statusGroup: {
    borderRadius: 2,
    textAnchor: 'middle',
    textColor: '#111111',
    textX: 12,
    width: 24,
  },
  statusGroupToSample: {
    color: TRANSPARENT,
  },
  subjectToStatusGroup: {
    color: '#555555',
  },
  subjectToSubject: {
    color: '#555555',
  },
  subject: {
    borderRadius: NODE_HEIGHT / 2,
    borderColor: '#555555',
    borderColorHover: '#777777',
    textAnchor: 'middle',
    textColor: '#777777',
    textX: 37.5,
    width: 75,
  },
  subjectWithSamples: {
    borderRadius: NODE_HEIGHT / 2,
    textAnchor: 'middle',
    textColor: '#111111',
    textX: 37.5,
    width: 75,
  },
  textVerticalShift: 18,
  verticalSpacing: {
    default: VERTICAL_SPACING_DEFAULT_FACTOR * NODE_HEIGHT,
    min: VERTICAL_SPACING_MIN_FACTOR * NODE_HEIGHT,
  },
};

const NODE_TYPE = {
  SAMPLE: 'sample',
  STATUS_GROUP: 'statusGroup',
  SUBJECT_WITH_SAMPLES: 'subjectWithSamples',
  SUBJECT: 'subject',
};

const legendSvg = `
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="502px" height="40px" viewBox="0 0 502 40" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <rect id="path-1" x="26" y="-14" width="154" height="40"></rect>
    <mask id="mask-2" maskContentUnits="userSpaceOnUse" maskUnits="objectBoundingBox" x="0" y="0" width="180" height="40" fill="white">
      <use xlink:href="#path-1"></use>
    </mask>
    <rect id="path-3" x="39" y="0" width="256" height="40"></rect>
    <mask id="mask-4" maskContentUnits="userSpaceOnUse" maskUnits="objectBoundingBox" x="0" y="0" width="256" height="40" fill="white">
      <use xlink:href="#path-3"></use>
    </mask>
    <polyline class="legendStatusHover" id="legendStatus" points="0 40 40 40 40 0 0 0 0 40"></polyline>
    <mask id="mask-6" maskContentUnits="userSpaceOnUse" maskUnits="objectBoundingBox" x="0" y="0" width="40" height="40" fill="white">
      <use xlink:href="#legendStatus"></use>
    </mask>
    <circle class="legendStatusHover" id="path-7" cx="20" cy="20" r="6"></circle>
    <mask id="mask-8" maskContentUnits="userSpaceOnUse" maskUnits="objectBoundingBox" x="0" y="0" width="12" height="12" fill="white">
      <use xlink:href="#path-7"></use>
    </mask>
    <polyline id="path-9" points="0 40 40 40 40 0 0 0 0 40"></polyline>
    <mask id="mask-10" maskContentUnits="userSpaceOnUse" maskUnits="objectBoundingBox" x="0" y="0" width="40" height="40" fill="white">
      <use xlink:href="#path-9"></use>
    </mask>
  </defs>
  <g>
    <use stroke="#555555" mask="url(#mask-4)" stroke-width="2" fill="#282828" xlink:href="#path-3"></use>
    <text><tspan x="57" y="29">CRITICAL</tspan></text>
    <text><tspan x="108.212" y="29">INVALID</tspan></text>
    <text><tspan x="154" y="29">TIMEOUT</tspan></text>
    <text><tspan x="204" y="29">WARNING</tspan></text>
    <text><tspan x="259.173714" y="29">INFO</tspan></text>
    <use stroke="#555555" mask="url(#mask-6)" stroke-width="2" fill="#282828" xlink:href="#legendStatus"></use>
    <use class="legendStatusHover" stroke="#ABABAB" mask="url(#mask-8)" fill="none" stroke-width="3" xlink:href="#path-7"></use>
    <rect class="legendStatusHover" fill="#ABABAB" x="19" y="17" width="2" height="3" rx="0.800000012"></rect>
    <circle class="legendStatusHover" fill="#ABABAB" cx="20" cy="22" r="1"></circle>
    <circle fill="${styl.statusColor.Critical}" cx="76" cy="14" r="3"></circle>
    <circle fill="${styl.statusColor.Invalid}" cx="124" cy="14" r="3"></circle>
    <circle fill="${styl.statusColor.Timeout}" cx="173" cy="14" r="3"></circle>
    <circle fill="${styl.statusColor.Warning}" cx="224" cy="14" r="3"></circle>
    <circle fill="${styl.statusColor.Info}" cx="268" cy="14" r="3"></circle>
  </g>
  <g id="legendTimeElapsed" transform="translate(301, 0)">
    <g stroke="#555555" stroke-width="2" fill="#282828">
      <use mask="url(#mask-10)" xlink:href="#path-9"></use>
    </g>
    <g transform="translate(13, 14)">
      <use stroke="#555555" mask="url(#mask-2)" stroke-width="2" fill="#282828" xlink:href="#path-1"></use>
      <g fill="#ABABAB">
        <path d="M8.0342226,3.10937794 L7.3560292,3.10937794 C7.17517762,3.10937794 7.0169325,3.26484684 7.0169325,3.44252558 L7.0169325,6.35201493 C7.0169325,6.4408543 7.06214539,6.52969367 7.10735828,6.5963232 L9.00629981,8.46194997 C9.14193849,8.59520902 9.34539651,8.59520902 9.48103519,8.46194997 L9.95577058,7.99554327 C10.0914093,7.86228422 10.0914093,7.66239564 9.95577058,7.52913658 L8.3733193,5.95223777 L8.3733193,3.44252558 C8.3733193,3.26484684 8.21507418,3.10937794 8.0342226,3.10937794 L8.0342226,3.10937794 Z M7.6951259,0 C4.34937178,0 1.61399172,2.55413188 1.38792725,5.77455903 C1.38792725,5.84118856 1.36532081,5.93002793 1.36532081,5.99665746 L0.348030703,5.99665746 C0.0541468955,5.99665746 -0.104098232,6.32980509 0.0767533423,6.52969367 L1.77223685,8.55078934 C1.90787553,8.70625823 2.15654644,8.70625823 2.29218512,8.55078934 L3.98766863,6.52969367 C4.16852021,6.30759525 4.01027508,5.99665746 3.71639127,5.99665746 L2.72170761,5.99665746 L2.72170761,5.77455903 C2.94777208,3.28705668 5.09538452,1.33259055 7.67251945,1.33259055 C10.6113575,1.33259055 12.9398215,3.84230274 12.6233313,6.77400194 C12.3972668,8.88393697 10.3626866,10.8828228 8.19246773,11.0827114 C6.58741001,11.2381803 5.07277808,10.6607244 4.01027508,9.5280224 C3.8746364,9.37255351 3.69378482,9.28371414 3.51293325,9.50581256 L2.97037853,10.149898 C2.85734629,10.283157 2.94777208,10.3719964 3.06080431,10.4830456 C4.28155244,11.7490066 5.9544295,12.4597216 7.76294524,12.4375118 C11.0182736,12.3930921 13.7536536,9.86117004 13.9797181,6.66295273 C14.2736019,3.04274841 11.3347638,3.15620844e-15 7.6951259,3.15620844e-15 L7.6951259,0 Z"></path>
      </g>
      <text class="under-5-mins"><tspan x="41" y="9">UNDER 5 MINS</tspan></text>
      <text class="over-5-mins"><tspan x="117" y="9">OVER 5 MINS</tspan></text>
    </g>
  </g>
</svg>
`;

/**
 * Format the length of time since the status changed in seconds, minutes,
 * hours, days or weeks, e.g. "5m" for 5 minutes, or "3w" for 3 weeks.
 *
 * @param {Object} statusChangedAt - the statusChangedAt value
 * @returns {String} - the length of time since the status changed
 */
function getStatusTimeDisplay(statusChangedAt) {
  const ONE_SECOND_IN_MILLIS = 1000;
  const ONE_MINUTE_IN_SECONDS = 60;
  const ONE_HOUR_IN_MINUTES = 60;
  const ONE_DAY_IN_HOURS = 24;
  const ONE_WEEK_IN_DAYS = 7;
  const ms = Date.now() - (new Date(statusChangedAt)).getTime();
  const seconds = Math.floor(ms / ONE_SECOND_IN_MILLIS);
  if (seconds < ONE_MINUTE_IN_SECONDS) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / ONE_MINUTE_IN_SECONDS);
  if (minutes < ONE_HOUR_IN_MINUTES) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / ONE_HOUR_IN_MINUTES);
  if (hours < ONE_DAY_IN_HOURS) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / ONE_DAY_IN_HOURS);
  if (days < ONE_WEEK_IN_DAYS) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / ONE_WEEK_IN_DAYS);
  return `${weeks}w`;
} // getStatusTimeDisplay

class StatusGroup {
  constructor(absolutePath, status) {
    this.id = absolutePath + '#' + statuses.indexOf(status);
    this.status = status;
    this.children = [];
  }

  get sampleCount() {
    return this.children.length;
  }

  upsertSample(sample) {
    const foundIdx = this.children.findIndex((s) => s.id === sample.id);
    if (foundIdx >= 0) {
      this.children[foundIdx] = sample;
    } else {
      this.children.push(sample);
    }
  }

  static compare(a, b) {
    let retval = 0;
    if (a.id > b.id) {
      retval = 1;
    } else if (a.id < b.id) {
      retval = -1;
    }

    return retval;
  }
} // StatusGroup

/**
 * Discern the type of node this is since the different node types have
 * different ways of being rendered.
 *
 * @param {Object} d - the data bound to the node
 * @returns {String} - the node type
 */
function nodeType(d) {
  if (d.aspect) {
    return NODE_TYPE.SAMPLE;
  }

  if (d instanceof StatusGroup) {
    return NODE_TYPE.STATUS_GROUP;
  }

  return (d.samples && d.samples.length) ?
    NODE_TYPE.SUBJECT_WITH_SAMPLES : NODE_TYPE.SUBJECT;
} // nodeType

function tagSorter(a, b) {
  const NEG = -1;
  if (a.name < b.name) {
    return NEG;
  }

  if (a.name > b.name) {
    return 1;
  }

  return 0;
} // tagSorter

function tags(d) {
  let arr;
  switch (nodeType(d)) {
    case NODE_TYPE.SAMPLE:
      arr = d.aspect.tags; // TODO also show subject tags here?
      break;
    default:
      arr = d.tags;
  }
  return arr.sort(tagSorter)
    .map((t) => `<span class="tag">${t.name}</span> `)
    .join('');
} // tags

function relatedLinks(d) {
  let arr = d.relatedLinks;
  let retval = '<div id="modalRelatedLinks"><h3>Related Links</h3><ul>';
  retval += arr.sort(tagSorter)
    .map((r) => `<li><a href="${r.url}" target="_blank">${r.name}</a></li>`)
    .join('');
  retval += '</ul></div>';
  return retval;
} // relatedLinks

const modalTemplate = {
  subject: (d) => `
    ${relatedLinks(d)}
    <div class="modalSection">
      <h3>Description</h3>
      <p>${d.description || ''}</p>
    </div>`,
  sample: (d) => `
    ${relatedLinks(d)}
    <div class="modalSection">
      <h3>Status</h3>
      <p>
        <span style="color: ${styl.statusColor[d.status]}">●</span>︎
        ${d.status} <span class="sep">|</span>
        <span class="displayDuration" id="modalDuration"
          data-statuschangedat="${d.statusChangedAt}"
        >${getStatusTimeDisplay(d.statusChangedAt)}</span>
      </p>
    </div>
    <div class="modalSection">
      <h3>Value</h3>
      <p>${d.sampleValue}${d.aspect.valueLabel || ''}</p>
    </div>
    <div class="modalSection">
      <h3>Message</h3>
      <p>${d.messageCode || ''}</p>
      <p class="longText">${d.messageBody || ''}</p>
    </div>
    <div class="modalSection">
      <h3>Description</h3>
      <p class="longText">${d.aspect.description || ''}</p>
    </div>`,
};

/**
 * Returns true if status changed within the last DURATION_THRESHOLD
 * milliseconds.
 *
 * @param {Object} d - the data bound to the node
 * @returns {Boolean} - true if the status changed within the last
 *  DURATION_THRESHOLD milliseconds.
 */
function statusIsNew(d) {
  const chg = new Date(d.statusChangedAt);
  return (Date.now() - chg.getTime()) < DURATION_THRESHOLD;
} // statusIsNew

/**
 * Sort based on sample name (asc), statusGroup status (worst first), subject
 * absolutePath (asc).
 *
 * @param {Object} a - the first element to compare
 * @param {Object} b - the second element to compare
 * @returns {Integer} - negative number if a < b, position number if a > b, or
 *  zero if a == b
 */
function nodeSorter(a, b) {
  const NEG = -1;
  let asorter;
  let bsorter;
  switch (nodeType(a)) {
    case NODE_TYPE.SAMPLE:
      asorter = a.name;
      break;
    case NODE_TYPE.STATUS_GROUP:
      asorter = a.id;
      break;
    default: // subjectWithSamples, subject
      asorter = a.absolutePath;
  }
  switch (nodeType(b)) {
    case NODE_TYPE.SAMPLE:
      bsorter = b.name;
      break;
    case NODE_TYPE.STATUS_GROUP:
      bsorter = b.id;
      break;
    default: // subjectWithSamples, subject
      bsorter = b.absolutePath;
  }

  if (asorter > bsorter) {
    return 1;
  }

  if (asorter < bsorter) {
    return NEG;
  }

  return 0;
} // nodeSorter

const partition = d3.layout.partition() // eslint-disable-line no-undef
  .value((d) => d.status === utils.statuses.OK ? 0 : 1)
  .sort(nodeSorter);
let modal;
let modalOuter;
let modalContents;
let shouldRerender = true;
let hierarchy = {};
let nodes = [];
let vertOffset = 0;
let links = [];
let yPositions = [];

// TODO the following "ignoreSample" function is only temporary--remove it
//  once we are streaming only the appropriate events to each client.

/**
 * Returns true if this perspective should just ignore this sample.
 *
 * @param {String} name - sample's name
 * @returns {Boolean} true if this perspective should ignore this sample
 */
function ignoreSample(name) {
  return name.indexOf(hierarchy.absolutePath) !== 0;
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
  return absolutePath.indexOf(hierarchy.absolutePath) !== 0;
} // ignoreSubject

/**
 * Recursively massages the hierarchy format to make it reflect the hierarchy
 * we render in this lens: subject contains children subjects and/or children
 * statusGroups, statusGroup contains children samples.
 *
 * @param {Object} d - a node in the hierarchy
 * @returns {Object} - the updated hierarchy
 */
function childrenize(d) {
  if (d.children) {
    d.children.forEach((c) => {
      // Update the child in place here
      c = childrenize(c); // eslint-disable-line no-param-reassign
    });
  } else {
    d.children = [];
  }

  if (d.samples && d.samples.length) {
    const statusGroupMap = {
      Critical: new StatusGroup(d.absolutePath, 'Critical'),
      Timeout: new StatusGroup(d.absolutePath, 'Timeout'),
      Invalid: new StatusGroup(d.absolutePath, 'Invalid'),
      Warning: new StatusGroup(d.absolutePath, 'Warning'),
      Info: new StatusGroup(d.absolutePath, 'Info'),
      OK: new StatusGroup(d.absolutePath, 'OK'),
    };
    d.samples.forEach((s) => {
      s.sampleValue = s.value.slice(0); // create a copy (not a reference)
      delete s.value;
      statusGroupMap[s.status].upsertSample(s);
    });
    delete d.samples; // don't need the original samples array anymore
    const statusGroupArray = d3 // eslint-disable-line no-undef
      .values(statusGroupMap)
      .filter((sg) => sg.sampleCount > 0)
      .map((sg) => sg)
      .sort(StatusGroup.compare);
    d.children = d.children.concat(statusGroupArray);
  }

  return d;
} // childrenize

/**
 * Returns the worst status of the all the elements in the array.
 *
 * @param {Array} arr - an array of objects with a status attribute
 * @returns {String} - the worst status of all the elements in the array
 */
function worst(arr) {
  const order = {
    Critical: 0,
    Invalid: 1,
    Timeout: 2,
    Warning: 3,
    Info: 4,
    OK: 5,
  };
  const w = d3.min(arr, (d) => order[d.status]); // eslint-disable-line no-undef
  return statuses[w];
} // worst

/**
 * Recursively walk the hierarchy to roll up the worst sample status to the
 * parent node.
 *
 * @param {node} d - the node in the hierarchy
 * @returns {Object} - the updated hierarchy
 */
function rollupStatus(d) {
  let statusTester = [];
  if (d.status === undefined) {
    d.status = 'OK';
  }

  if (d.children) {
    d.children.forEach((kid) => {
      // Update in place
      kid = rollupStatus(kid); // eslint-disable-line no-param-reassign
    });
    statusTester = [].concat(d.children);
  }

  if (d.samples && d.samples.length) {
    statusTester = statusTester.concat(d.samples);
  }

  statusTester.push(d);
  d.status = worst(statusTester);
  return d;
} // rollupStatus

/**
 * Generate a map of y-coords based on the partition layout's x value. This is
 * used to calculate the y-position of a node based on a fixed pill height.
 */
function updateYPositions() {
  yPositions = nodes.filter((d) => {
    switch (nodeType(d)) {
      case NODE_TYPE.SUBJECT_WITH_SAMPLES:
      case NODE_TYPE.SUBJECT:
        return true;
      default:
        return false;
    }
  })
  .map((d) => d.x)
  .filter((d, i, ar) => ar.indexOf(d) === i) // get unique values
  .sort();
} // updateYPositions


/**
 * Determine the status group's width based on the number of samples.
 *
 * @param {Object} d - the data bound to the status group node
 * @returns {Integer} - the width
 */
function getStatusGroupWidth(d) {
  return styl.statusGroup.width + d.children.length * styl.sample.width;
} // getStatusGroupWidth

/**
 * Determine the status group's x-coordinate, based on its parent (i.e. a
 * subject with samples), its position in the list of its sibling statusGroups,
 * and the number of samples in each of its previous sibling statusGroups.
 *
 * @param {Object} d - the data bound to the status group node
 * @returns {Integer} - the x-coordinate
 */
function getStatusGroupX(d) {
  let x = d.parent.depth * (styl.subjectWithSamples.width +
    styl.horizontalSpacing.betweenSubjects) +
    styl.subjectWithSamples.width +
    styl.horizontalSpacing.betweenSubjectAndSample;
  const sibs = d.parent.children
    .filter((k) => nodeType(k) === NODE_TYPE.STATUS_GROUP)
    .sort(StatusGroup.compare);
  const thisIndex = sibs.findIndex((k) => k.id === d.id);
  const previousSibs = sibs.slice(0, thisIndex);
  previousSibs.forEach((b) => {
    x += styl.horizontalSpacing.betweenSampleGroups + getStatusGroupWidth(b);
  });
  return x;
} // getStatusGroupX

/**
 * Determine the sample's x-coordinate, based on its parent statusGroup's
 * x-coordinate and the sample's position in the list of its sibling samples.
 *
 * @param {Object} d - the data bound to the status group node
 * @returns {Integer} - the x-coordinate
 */
function getSampleX(d) {
  let x = getStatusGroupX(d.parent) + styl.statusGroup.width;
  const sibs = d.parent.children.sort(nodeSorter);
  const thisIndex = sibs.findIndex((k) => k.id === d.id);
  x += thisIndex * styl.sample.width;
  return x;
} // getSampleX

/**
 * Determine the node's xy coordinates based on node type.
 *
 * @param {Object} d - the data bound to the node
 * @returns {Object} - the xy coordinates of the node
 */
function getPosition(d) {
  let x = 0;
  let yFactor = 0;
  switch (nodeType(d)) {
    case NODE_TYPE.SAMPLE:
      x = getSampleX(d);
      yFactor = yPositions.indexOf(d.parent.parent.x);
      break;
    case NODE_TYPE.STATUS_GROUP:
      x = getStatusGroupX(d);
      yFactor = yPositions.indexOf(d.parent.x);
      break;
    case NODE_TYPE.SUBJECT_WITH_SAMPLES:
    case NODE_TYPE.SUBJECT:
      x = d.depth * (styl.subjectWithSamples.width +
        styl.horizontalSpacing.betweenSubjects);
      yFactor = yPositions.indexOf(d.x);
      break;
    default: // noop
  }
  const y = yFactor < 0 ? 0 : TOP_ADJUST + yFactor * (NODE_HEIGHT + vertOffset);
  return { x: x, y: y };
} // getPosition

function bindKey(d) {
  return d.id;
} // bindKey

function connectorType(d) {
  if (d.source instanceof StatusGroup) {
    return 'statusGroupToSample';
  }

  if (d.target instanceof StatusGroup) {
    return 'subjectToStatusGroup';
  }

  return 'subjectToSubject';
} // connectorType

function adjustVeritcalOffset() {
  const rowsToDisplay = yPositions.length;
  const viewportHeight = document.documentElement.clientHeight - ADJUST_HEIGHT;
  vertOffset = styl.verticalSpacing.default;
  let rowsWillFit = (viewportHeight - vertOffset) / (NODE_HEIGHT + vertOffset);
  while ((rowsToDisplay > rowsWillFit) &&
    (vertOffset > styl.verticalSpacing.min)) {
    vertOffset -= VERTICAL_OFFSET_STEP;
    rowsWillFit = (viewportHeight - vertOffset) / (NODE_HEIGHT + vertOffset);
  }
} // adjustVeritcalOffset

function getDisplayText(d) {
  const adjustMaxChars = ASPECT_NAME_CHARS + (d.messageCode ? 0 : 3);
  switch (nodeType(d)) {
    case NODE_TYPE.SAMPLE:
      return d.aspect.name.length > adjustMaxChars ?
        d.aspect.name.substring(0, adjustMaxChars) + '…' : d.aspect.name;
    case NODE_TYPE.STATUS_GROUP:
      return d.sampleCount;
    default: // subjectWithSamples, subject
      return d.name.length > SUBJECT_NAME_CHARS ?
        d.name.substring(0, SUBJECT_NAME_CHARS) + '…' : d.name;
  }
} // getDisplayText

function rectStyleFill(d) {
  switch (nodeType(d)) {
    case NODE_TYPE.STATUS_GROUP:
    case NODE_TYPE.SUBJECT_WITH_SAMPLES:
      return styl.statusColor[d.status];
    default: // sample, subject
      return styl.bgcolor;
  }
} // rectStyleFill

function rectStyleStroke(d) {
  switch (nodeType(d)) {
    case NODE_TYPE.SUBJECT:
      return styl.subject.borderColor;
    default:
      return styl.statusColor[d.status];
  }
} // rectStyleStroke

function rectStyle(d) {
  return {
    fill: rectStyleFill(d),
    stroke: rectStyleStroke(d),
    'stroke-opacity': 1,
  };
} // rectStyle

function rectStyleHover(d) {
  const s = {
    fill: '',
    stroke: '',
    'stroke-opacity': 1,
  };
  switch (nodeType(d)) {
    case NODE_TYPE.STATUS_GROUP:
      return {};
    case NODE_TYPE.SUBJECT_WITH_SAMPLES:
      s.fill = styl.statusColor[d.status];
      s.stroke = '#ffffff';
      s['stroke-opacity'] = 0.4;
      break;
    case NODE_TYPE.SUBJECT:
      s.fill = styl.bgcolor;
      s.stroke = styl.subject.borderColorHover;
      break;
    default: // sample
      s.fill = styl.bgcolor;
      s.stroke = styl.statusColor[d.status];
  }

  return s;
} // rectStyleHover

function doMouseOver(d) {
  const txt = d3.select(`[id="${d.id}"] tspan`); // eslint-disable-line no-undef
  const rect = d3.select(`[id="${d.id}"] rect`); // eslint-disable-line no-undef
  rect.style(rectStyleHover(d));
  switch (nodeType(d)) {
    case NODE_TYPE.SAMPLE:
      d._textColor = txt.style('fill');
      txt.style('fill', styl.hoverTextColor);
      break;
    case NODE_TYPE.SUBJECT_WITH_SAMPLES:
      d._textColor = txt.style('fill');
      txt.style('fill', styl.hoverTextColor);
      break;
    case NODE_TYPE.SUBJECT:
      d._textColor = txt.style('fill');
      txt.style('fill', styl.hoverTextColor);
      break;
    default: // statusGroup
      return;
  }
} // doMouseOver

function hideModal() {
  modal.style('display', 'none');
} // hideModal

function showModal(d) {
  let scrollDiv = '';
  switch (nodeType(d)) {
    case NODE_TYPE.SAMPLE:
      d3.select('#modalTopBar') // eslint-disable-line no-undef
        .style('background-color', styl.statusColor[d.status]);
      d3.select('#modalDismiss') // eslint-disable-line no-undef
        .attr('class', 'dark');
      d3.select('#modalContents h1') // eslint-disable-line no-undef
        .text(d.aspect.name);
      d3.select('#modalContents h2') // eslint-disable-line no-undef
        .text(d.name);
      d3.select('#modalContents #tags') // eslint-disable-line no-undef
        .html(tags(d));
      scrollDiv += modalTemplate.sample(d);
      break;
    case NODE_TYPE.STATUS_GROUP:
      return;
    case NODE_TYPE.SUBJECT:
      d3.select('#modalTopBar') // eslint-disable-line no-undef
        .style('background-color', TRANSPARENT);
      d3.select('#modalDismiss') // eslint-disable-line no-undef
        .attr('class', 'light');
      d3.select('#modalContents h1') // eslint-disable-line no-undef
        .text(d.name);
      d3.select('#modalContents h2') // eslint-disable-line no-undef
        .text(d.absolutePath);
      d3.select('#modalContents #tags') // eslint-disable-line no-undef
        .html(tags(d));
      scrollDiv += modalTemplate.subject(d);
      break;
    case NODE_TYPE.SUBJECT_WITH_SAMPLES:
      d3.select('#modalTopBar') // eslint-disable-line no-undef
        .style('background-color', styl.statusColor[d.status]);
      d3.select('#modalDismiss') // eslint-disable-line no-undef
        .attr('class', 'dark');
      d3.select('#modalContents h1') // eslint-disable-line no-undef
        .text(d.name);
      d3.select('#modalContents h2') // eslint-disable-line no-undef
        .text(d.absolutePath);
      d3.select('#modalContents #tags') // eslint-disable-line no-undef
        .html(tags(d));
      scrollDiv += modalTemplate.subject(d);
      break;
    default: // noop
  }
  d3.select('#modalScroll') // eslint-disable-line no-undef
    .html(scrollDiv);
  modal.style('display', 'block');
} // showModal

function doMouseOut(d) {
  if (d._textColor) {
    const txt = d3 // eslint-disable-line no-undef
      .select(`[id="${d.id}"] tspan`);
    txt.style('fill', d._textColor);
    delete d._textColor;
  }

  const rect = d3 // eslint-disable-line no-undef
    .select(`[id="${d.id}"] rect`);
  rect.style(rectStyle(d));
} // doMouseOut

function updateStatusTimes() {
  d3.selectAll('tspan.displayDuration') // eslint-disable-line no-undef
    .data(nodes, bindKey)
    .transition().duration(TRANSITION_DURATION)
    .style('fill', (d) => statusIsNew(d) ? '#1c979c' : '#777777')
    .text((d) => nodeType(d) === NODE_TYPE.SAMPLE ?
      getStatusTimeDisplay(d.statusChangedAt) : '');
  if (document.getElementById('modal').style.display !== 'none') {
    const modalDuration = document.getElementById('modalDuration');
    if (modalDuration) {
      modalDuration.innerHTML =
        getStatusTimeDisplay(modalDuration.dataset.statuschangedat);
    }
  }
} // updateStatusTimes


/**
 * Begin the enter-update-exit pattern. Adds hidden svg elements to the DOM for
 * all the new data elements.
 *
 * @param {selection} sel - the enter selection for the nodes, i.e. placeholder
 *  nodes for each data element for which no corresponding existing DOM element
 *  was found in the current selection
 * @param {selection} con - the enter selection for the connector paths
 */
function doEnter(sel, con) {
  const g = sel.append('g') // create one svg "group" per node
    .attr('class', nodeType)
    .attr('id', (d) => d.id);
  g.append('rect') // add a rectangle for each node
    .attr('height', NODE_HEIGHT)
    .attr('rx', (d) => styl[nodeType(d)].borderRadius)
    .attr('width', (d) => styl[nodeType(d)].width);
  const txt = g.append('text')
    .attr('class', 'displayNodeInfo')
    .attr('text-anchor', (d) => styl[nodeType(d)].textAnchor)
    .attr('x', (d) => styl[nodeType(d)].textX)
    .attr('y', styl.textVerticalShift);
  txt.append('tspan') // display name inside each node
    .attr('class', 'displayName');
  txt.append('tspan') // display duration inside each sample node
    .attr('class', 'displayDuration')
    .attr('dx', 8);
  txt.append('tspan') // display message inside each sample node
    .attr('class', 'displayMessage')
    .attr('dx', 6);
  con.append('path') // create connector paths between nodes
    .attr('class', connectorType)
    .attr('fill', TRANSPARENT)
    .attr('stroke', TRANSPARENT)
    .attr('stroke-width', 2);
} // doEnter

/**
 * The "update" part of the enter-update-exit pattern.
 *
 * @param {selection} sel - the selection with nodes for each data element
 * @param {selection} con - the selection with the connectors between nodes
 */
function doUpdate(sel, con) {
  let maxPosX = 0;
  sel // move nodes to their new positions
    .order()
    .on('mouseover', doMouseOver)
    .on('mouseout', doMouseOut)
    .on('click', showModal);
  sel.attr('class', nodeType);
  sel.transition().duration(TRANSITION_DURATION)
    .attr('transform', (d) => {
      const pos = getPosition(d);
      if (pos.x > maxPosX) {
        maxPosX = pos.x;
      }

      return `translate(${pos.x}, ${pos.y})`;
    });
  const rect = sel.selectAll('rect') // adjust rect style for node's status
    .data(nodes, bindKey);
  rect.transition().duration(TRANSITION_DURATION)
    .attr('width', (d) => {
      const nt = nodeType(d);
      switch (nt) {
        case NODE_TYPE.STATUS_GROUP:
          return getStatusGroupWidth(d);
        default:
          return styl[nt].width;
      }
    })
    .style({
      fill: (d) => rectStyleFill(d),
      stroke: (d) => rectStyleStroke(d),
      'stroke-opacity': 1,
    });
  sel.selectAll('tspan.displayName') // Display node name
    .data(nodes, bindKey)
    .transition().duration(TRANSITION_DURATION)
    .style('fill', (d) => {
      const nt = nodeType(d);
      switch (nt) {
        case NODE_TYPE.SAMPLE:
          return statusIsNew(d) ?
            styl.sample.textColorIsNew : styl.sample.textColor;
        default:
          return styl[nt].textColor;
      }
    })
    .text(getDisplayText);
  updateStatusTimes(sel);
  sel.selectAll('tspan.displayMessage') // eslint-disable-line no-undef
    .data(nodes, bindKey)
    .transition().duration(TRANSITION_DURATION)
    .text((d) => nodeType(d) === NODE_TYPE.SAMPLE && d.messageCode ?
      '│ ' + d.messageCode : '');

  con.transition().duration(TRANSITION_DURATION)
    .attr('id', (d) => d.source.absolutePath + '>>>' +
      (d.target.absolutePath || d.target.id))
    .attr('stroke', (d) => {
      if (d.source.sampleCount > 0) {
        return styl.statusColor[d.source.status];
      }

      return styl[connectorType(d)].color;
    })
    .attr('d', (d) => {
      const origin = getPosition(d.source);
      origin.x += styl.subjectWithSamples.width + 1;
      origin.y += NODE_HEIGHT / 2;
      const dest = getPosition(d.target);
      const horizRightBeforeSplit = styl.horizontalSpacing.betweenSubjects *
        styl.horizontalSpacing.connectorSplit;
      const vertDown = dest.y + NODE_HEIGHT / 2;
      const horizRightAfterSplit = styl.horizontalSpacing.betweenSubjects *
        (1 - styl.horizontalSpacing.connectorSplit) - 2;
      switch (connectorType(d)) {
        case 'subjectToStatusGroup':
          return `M ${origin.x} ${origin.y} ` +
            `h ${styl.horizontalSpacing.betweenSubjectAndSample - 1} `;
        default: // subjectToSubject
          if (origin.y === vertDown) {
            return `M ${origin.x} ${origin.y} ` +
              `h ${horizRightBeforeSplit + horizRightAfterSplit}`;
          }

          // TODO check if next sibling's source is different, make this a
          // curve, otherwise make it a right angle
          return `M ${origin.x} ${origin.y} ` +
            `h ${horizRightBeforeSplit} ` +
            `V ${vertDown-CONNECTOR_CURVE} ` +
            `a ${CONNECTOR_CURVE} ${CONNECTOR_CURVE} 0 0 0 ` +
            `${CONNECTOR_CURVE} ${CONNECTOR_CURVE} ` +
            `h ${horizRightAfterSplit-CONNECTOR_CURVE}`;
      }
    });
  size(maxPosX + 218);
} // doUpdate

/**
 * Complete the enter-update-exit pattern by removing the DOM elements for
 * which no data element is found.
 *
 * @param {selection} sel - the exit selection, i.e. existing DOM elements in
 *  the current selection for which no new data element was found
 * @param {selection} con - the selection with the connectors between nodes
 */
function doExit(sel, con) {
  sel.remove();
  con.remove();
} // doExit

/**
 * Rerender the contents of the visualization.
 */
function redraw() {
  const hcopy = JSON.parse(JSON.stringify(hierarchy));
  nodes = partition.nodes(childrenize(rollupStatus(hcopy)))
    .filter((n) => n.status !== utils.statuses.OK)
    .sort(nodeSorter);
  links = partition.links(nodes)
    .filter((d) => connectorType(d) !== 'statusGroupToSample' &&
      d.source.status !== utils.statuses.OK &&
      d.target.status !== utils.statuses.OK);
  updateYPositions();
  adjustVeritcalOffset();
  const svgHeight = ADJUST_HEIGHT +
    yPositions.length * (NODE_HEIGHT + vertOffset);
  const vis = d3.select('svg#bracket') // eslint-disable-line no-undef
    .attr('height', svgHeight);
  const g = vis.selectAll('g').data(nodes, bindKey);
  const c = vis.selectAll('path').data(links);
  doEnter(g.enter(), c.enter());
  doUpdate(g, c);
  doExit(g.exit(), c.exit());
} // redraw

/**
 * Render the animated "pulse" indicator.
 *
 * @param {selection} container - the svg container for the "pulse"
 */
function pulse(container) {
  const rng = [0,
    styl.pagehead.pulse.duration / styl.pagehead.pulse.rangePointsFactor];

  /**
   * Repeat the "pulse" animation in a loop.
   */
  function doPulse() {
    let p = d3.select('#pulse'); // eslint-disable-line no-undef
    (function repeat() {
      p = p.transition().duration(styl.pagehead.pulse.duration)
        .attr('r', styl.pagehead.pulse.minRadius)
      .transition().duration(styl.pagehead.pulse.duration)
        .attr('r', styl.pagehead.pulse.maxRadius)
      .ease('sine')
      .each('end', repeat);
    }());
  } // doPulse

  container.selectAll('circle')
    .data(d3.scale.ordinal() // eslint-disable-line no-undef
      .domain(d3.range(1)) // eslint-disable-line no-undef
      .rangePoints(rng)
      .domain())
    .enter()
    .append('circle')
    .attr('id', 'pulse')
    .attr('fill', styl.pagehead.pulse.color)
    .attr('r', styl.pagehead.pulse.minRadius)
    .attr('cx', styl.pagehead.pulse.x)
    .attr('cy', styl.pagehead.pulse.y)
    .each(doPulse);
  container.append('circle')
    .attr('id', 'outerPulse')
    .attr('fill', TRANSPARENT)
    .attr('stroke', styl.pagehead.pulse.color)
    .attr('r', styl.pagehead.pulse.outerRadius)
    .attr('cx', styl.pagehead.pulse.x)
    .attr('cy', styl.pagehead.pulse.y);
} // pulse

function updateInHierarchy(root, subject, sample) {
  if (root.absolutePath === subject) {
    if (root.samples) {
      const foundIdx = root.samples.findIndex((s) => s.name === sample.name);
      if (foundIdx >= 0) {
        root.samples[foundIdx] = sample;
        return true;
      }

      return false;
    }

    return false;
  }

  if (root.children) {
    root.children.forEach((kid) => {
      const retval = updateInHierarchy(kid, subject, sample);
      if (retval) {
        return true;
      }
    });
  }

  return false;
} // updateInHierarchy

/**
 * Dynamically set the bracket svg width based on the viewport.
 */
function size(wid) {
  d3.select('svg#bracket') // eslint-disable-line no-undef
    .attr('width', wid);
} // size

function doNothing() {
  d3.event.stopPropagation();
} // doNothing

function defineLegend() {
  const legend = d3.select(utils.element) // eslint-disable-line no-undef
    .append('div')
    .attr('id', 'legend')
    .append('svg')
    .attr('width', '532')
    .attr('height', '40')
    .attr('viewBox', '0 0 532 40');
  const statusGroup = legend.append('g')
    .attr('class', 'legend-status');
  const statusGroupHead = statusGroup.append('g')
    .attr('id', 'statusHoverTarget');
  statusGroupHead.append('rect')
    .attr('width', '40')
    .attr('height', '40')
    .attr('class', 'box');
  const statusIcon = statusGroupHead.append('g')
    .attr('class', 'status-icon')
    .attr('transform', 'translate(13, 14)');
  statusIcon.append('circle')
    .attr('cx', '7.5')
    .attr('cy', '5.5')
    .attr('r', '6')
    .attr('class', 'outer');
  statusIcon.append('rect')
    .attr('x', '6.5')
    .attr('y', '3')
    .attr('width', '2')
    .attr('height', '3')
    .attr('rx', '0.800000012')
    .attr('class', 'inner');
  statusIcon.append('circle')
    .attr('cx', '7.5')
    .attr('cy', '7.7')
    .attr('r', '1')
    .attr('class', 'inner');
  const statusGroupBody = statusGroup.append('g')
    .attr('transform', 'translate(40, 0)');
  statusGroupBody.append('rect')
    .attr('width', '284')
    .attr('height', '40')
    .attr('class', 'box');
  const statusGroupBodyCritical = statusGroupBody.append('g')
    .attr('transform', 'translate(5, 0)');
  statusGroupBodyCritical.append('rect')
    .attr('x', '22.4')
    .attr('y', '12')
    .attr('width', '10')
    .attr('height', '5')
    .attr('rx', '2.5')
    .style('fill', styl.statusColor.Critical);
  statusGroupBodyCritical.append('text')
    .attr('x', '28.4')
    .attr('y', '29')
    .attr('text-anchor', 'middle')
    .text('Critical');
  const statusGroupBodyInvalid = statusGroupBody.append('g')
    .attr('transform', 'translate(61.8, 0)');
  statusGroupBodyInvalid.append('rect')
    .attr('x', '22.4')
    .attr('y', '12')
    .attr('width', '10')
    .attr('height', '5')
    .attr('rx', '2.5')
    .style('fill', styl.statusColor.Invalid);
  statusGroupBodyInvalid.append('text')
    .attr('x', '28.4')
    .attr('y', '29')
    .attr('text-anchor', 'middle')
    .text('Invalid');
  const statusGroupBodyTimeout = statusGroupBody.append('g')
    .attr('transform', 'translate(118.6, 0)');
  statusGroupBodyTimeout.append('rect')
    .attr('x', '22.4')
    .attr('y', '12')
    .attr('width', '10')
    .attr('height', '5')
    .attr('rx', '2.5')
    .style('fill', styl.statusColor.Timeout);
  statusGroupBodyTimeout.append('text')
    .attr('x', '28.4')
    .attr('y', '29')
    .attr('text-anchor', 'middle')
    .text('Timeout');
  const statusGroupBodyWarning = statusGroupBody.append('g')
    .attr('transform', 'translate(175.4, 0)');
  statusGroupBodyWarning.append('rect')
    .attr('x', '22.4')
    .attr('y', '12')
    .attr('width', '10')
    .attr('height', '5')
    .attr('rx', '2.5')
    .style('fill', styl.statusColor.Warning);
  statusGroupBodyWarning.append('text')
    .attr('x', '28.4')
    .attr('y', '29')
    .attr('text-anchor', 'middle')
    .text('Warning');
  const statusGroupBodyInfo = statusGroupBody.append('g')
    .attr('transform', 'translate(227.2, 0)');
  statusGroupBodyInfo.append('rect')
    .attr('x', '22.4')
    .attr('y', '12')
    .attr('width', '10')
    .attr('height', '5')
    .attr('rx', '2.5')
    .style('fill', styl.statusColor.Info);
  statusGroupBodyInfo.append('text')
    .attr('x', '28.4')
    .attr('y', '29')
    .attr('text-anchor', 'middle')
    .text('Info');
  const elapsedGroup = legend.append('g')
    .attr('class', 'legend-elapsed')
    .attr('transform', 'translate(331, 0)');
  elapsedGroup.append('rect')
    .attr('width', '200px')
    .attr('height', '40px')
    .attr('class', 'box');
  const elapsedGroupHead = elapsedGroup.append('g')
    .attr('id', 'elapsedHoverTarget');
  elapsedGroupHead.append('rect')
    .attr('width', '40px')
    .attr('height', '40px')
    .attr('class', 'box');
  const elapsedIcon = elapsedGroupHead.append('g')
    .attr('class', 'elapsed-icon')
    .attr('transform', 'translate(13, 14)');
  elapsedIcon.append('path')
    .attr('d', 'M8.0342226,3.10937794 L7.3560292,3.10937794 C7.17517762,3.10937794 7.0169325,3.26484684 7.0169325,3.44252558 L7.0169325,6.35201493 C7.0169325,6.4408543 7.06214539,6.52969367 7.10735828,6.5963232 L9.00629981,8.46194997 C9.14193849,8.59520902 9.34539651,8.59520902 9.48103519,8.46194997 L9.95577058,7.99554327 C10.0914093,7.86228422 10.0914093,7.66239564 9.95577058,7.52913658 L8.3733193,5.95223777 L8.3733193,3.44252558 C8.3733193,3.26484684 8.21507418,3.10937794 8.0342226,3.10937794 L8.0342226,3.10937794 Z M7.6951259,0 C4.34937178,0 1.61399172,2.55413188 1.38792725,5.77455903 C1.38792725,5.84118856 1.36532081,5.93002793 1.36532081,5.99665746 L0.348030703,5.99665746 C0.0541468955,5.99665746 -0.104098232,6.32980509 0.0767533423,6.52969367 L1.77223685,8.55078934 C1.90787553,8.70625823 2.15654644,8.70625823 2.29218512,8.55078934 L3.98766863,6.52969367 C4.16852021,6.30759525 4.01027508,5.99665746 3.71639127,5.99665746 L2.72170761,5.99665746 L2.72170761,5.77455903 C2.94777208,3.28705668 5.09538452,1.33259055 7.67251945,1.33259055 C10.6113575,1.33259055 12.9398215,3.84230274 12.6233313,6.77400194 C12.3972668,8.88393697 10.3626866,10.8828228 8.19246773,11.0827114 C6.58741001,11.2381803 5.07277808,10.6607244 4.01027508,9.5280224 C3.8746364,9.37255351 3.69378482,9.28371414 3.51293325,9.50581256 L2.97037853,10.149898 C2.85734629,10.283157 2.94777208,10.3719964 3.06080431,10.4830456 C4.28155244,11.7490066 5.9544295,12.4597216 7.76294524,12.4375118 C11.0182736,12.3930921 13.7536536,9.86117004 13.9797181,6.66295273 C14.2736019,3.04274841 11.3347638,3.15620844e-15 7.6951259,3.15620844e-15 L7.6951259,0 Z');
  const elapsedGroupBody = elapsedGroup.append('g')
    .attr('transform', 'translate(40, 0)');
  elapsedGroupBody.append('text')
    .attr('x', '10')
    .attr('y', '23')
    .attr('class', 'under-5-mins')
    .text('Under 5 Mins');
  elapsedGroupBody.append('text')
    .attr('x', '90')
    .attr('y', '23')
    .attr('class', 'over-5-mins')
    .text('Over 5 Mins');
  const legendStatusHover = d3.select('#legend') // eslint-disable-line no-undef
    .append('div')
    .attr('id', 'legendStatusHover')
    .attr('class', 'legendHover')
    .text('Status');
  d3.select('#statusHoverTarget') // eslint-disable-line no-undef
    .on('mouseover', () => {
      legendStatusHover.style('display', 'block');
      d3.selectAll('.status-icon .outer') // eslint-disable-line no-undef
        .style({
          stroke: '#FFFFFF',
        });
      d3.selectAll('.status-icon .inner') // eslint-disable-line no-undef
        .style({
          fill: '#FFFFFF',
        });
      doNothing();
    })
    .on('mouseout', () => {
      legendStatusHover.style('display', null);
      d3.selectAll('.status-icon .outer') // eslint-disable-line no-undef
        .style({
          stroke: null,
        });
      d3.selectAll('.status-icon .inner') // eslint-disable-line no-undef
        .style({
          fill: null,
        });
      doNothing();
    });
  const legendElapsedHover = d3 // eslint-disable-line no-undef
    .select('#legend')
    .append('div')
    .attr('id', 'legendElapsedHover')
    .attr('class', 'legendHover')
    .text('Time elapsed since last status change');
  d3.select('#elapsedHoverTarget') // eslint-disable-line no-undef
    .on('mouseover', () => {
      legendElapsedHover.style('display', 'block');
      d3.select('.elapsed-icon') // eslint-disable-line no-undef
        .style({
          fill: '#FFFFFF',
        });
      doNothing();
    })
    .on('mouseout', () => {
      legendElapsedHover.style('display', null);
      d3.select('.elapsed-icon') // eslint-disable-line no-undef
        .style({
          fill: null,
        });
      doNothing();
    });
} // defineLegend

function defineModal() {
  modal = d3 // eslint-disable-line no-undef
    .select(utils.element)
    .append('div').attr('id', 'modal');
  modal.on('click', hideModal);
  modalOuter = modal.append('div').attr('id', 'modalOuter')
    .on('click', doNothing);
  modalOuter.append('div').attr('id', 'modalTopBar')
    .append('p').attr('id', 'modalDismiss')
    .text('×')
    .on('click', hideModal);
  modalContents = modalOuter.append('div')
    .attr('id', 'modalContents');
  modalContents.append('h1');
  modalContents.append('h2');
  modalContents.append('div').attr('id', 'tags');
  modalContents.append('div').attr('id', 'modalScroll');
} // defineModal

/**
 * Check whether we need to redraw in a loop with a delay so we don't have to
 * do expensive redraw on *every* change (helpful when thousands of changes
 * flood in at once). If we don't need to do a full redraw, at least sweep
 * through and update the status times.
 */
function redrawLoopWithDelay() {
  /**
   * Redraw only if necessary, then queue up the next loop.
   */
  function redrawOnlyIfNecessary() {
    if (shouldRerender) {
      shouldRerender = false;
      redraw();
    } else {
      updateStatusTimes();
    }

    redrawLoopWithDelay();
  } // redrawOnlyIfNecessary

  setTimeout(redrawOnlyIfNecessary, RENDER_LENS_LOOP_DELAY);
} // redrawLoopWithDelay

/**
 * Dynamically set the page header svg width based on the length of its
 * contents.
 */
function adjustPageHeadWidth() {
  const len = document.getElementById('lastUpdate').getComputedTextLength();
  d3.select('#pageHead') // eslint-disable-line no-undef
    .attr('width', len + styl.pagehead.widthPadding);
} // adjustPageHeadWidth

/**
 * Render the page header.
 */
function pagehead() {
  const phead = d3.select(utils.element) // eslint-disable-line no-undef
    .append('svg')
    .attr('id', 'pageHead')
    .attr('height', styl.pagehead.height)
    .attr('width', '700');
  pulse(phead);
  phead.append('text')
    .attr('id', 'lastUpdate')
    .attr('x', styl.pagehead.lastUpdate.x)
    .attr('y', styl.pagehead.lastUpdate.y)
    .text(`Loaded ${(new Date()).toUTCString()}`.toUpperCase());
  adjustPageHeadWidth();
} // pagehead

/**
 * Create the bracket svg, set its size, and initiate drawing.
 */
function doInitialRender() {
  pagehead();
  defineLegend();
  defineModal();
  d3.select(utils.element) // eslint-disable-line no-undef
    .append('svg')
    .attr('id', 'bracket')
    .style('background-color', styl.bgcolor);
  size(document.documentElement.clientWidth);
} // doInitialRender

/**
 * Update the "last updated" time displayed on the page.
 */
function lastUpdated() {
  d3.select('#lastUpdate') // eslint-disable-line no-undef
    .text(`Updated ${(new Date()).toUTCString()}`.toUpperCase());
  adjustPageHeadWidth();
} // lastUpdated

/*
 * Handle the load event.
 */
utils.element.addEventListener(utils.evt.load, () => {
  utils.addStylesheet('./focusRtBracket/lens-rtBracket.css');
  doInitialRender();

  /*
   * Register an event listener to respond when the fragment identifier of the
   * URL has changed (the part of the URL that follows the # symbol, including
   * the # symbol).
   */
  window.addEventListener('hashchange', (hashChangeEvt) => {
    // New URL: hashChangeEvt.newURL
    // Old URL: hashChangeEvt.oldURL
  }); // hashchange listener

  // Register an event listener to respond when the view has been resized
  window.addEventListener('resize', (resizeEvt) => {
    redraw(); // re-render to fill new size
  }); // resize listener
}); // "load" event listener

/*
 * Handle the hierarchyLoad event.
 */
utils.element.addEventListener(utils.evt.hierarchyLoad, (evt) => {
  hierarchy = evt.detail;
  redrawLoopWithDelay();

  // TODO For now, when an event comes in, we're just updating the big
  //  hierarchy json object and calling renderLens again on the whole object.
  //  I'd love to get to the point where we re-render the least amount of
  //  stuff we can, but that's going to be much trickier :)

  // Register an event listener to respond when a subject has been added.
  utils.element.addEventListener(utils.evt.subj.add, (subjAddEvt) => {
    lastUpdated();
    if (!ignoreSubject(subjAddEvt.detail.absolutePath)) {
      // TODO
    }
  }); // subject add event listener

  // Register an event listener to respond when a subject has been removed.
  utils.element.addEventListener(utils.evt.subj.rem, (subjRemEvt) => {
    lastUpdated();
    if (!ignoreSubject(subjRemEvt.detail.absolutePath)) {
      // TODO
      // removeSubjectFromHierarchy(subjRemEvt.detail.absolutePath);
      // shouldRerender = true;
    }
  }); // subject remove event listener

  // Register an event listener to respond when a subject has been updated.
  utils.element.addEventListener(utils.evt.subj.upd, (subjUpdEvt) => {
    lastUpdated();
    if (!ignoreSubject(subjUpdEvt.detail.old.absolutePath) ||
      !ignoreSubject(subjUpdEvt.detail.new.absolutePath)) {
      // TODO
    }
  }); // subject update event listener

  // Register an event listener to respond when a sample has been added.
  utils.element.addEventListener(utils.evt.samp.add, (sampAddEvt) => {
    lastUpdated();
    if (!ignoreSample(sampAddEvt.detail.name)) {
      // TODO
      // addSampleToHierarchy(sampAddEvt.detail);
      // shouldRerender = true;
    }
  }); // sample add event listener

  // Register an event listener to respond when a sample has been removed.
  utils.element.addEventListener(utils.evt.samp.rem, (sampRemEvt) => {
    lastUpdated();
    if (!ignoreSample(sampRemEvt.detail.name)) {
      // TODO
      // removeSampleFromHierarchy(sampRemEvt.detail.name);
      // shouldRerender = true;
    }
  }); // sample remove event listener

  // Register an event listener to respond when a sample has been updated.
  utils.element.addEventListener(utils.evt.samp.upd, (sampUpdEvt) => {
    lastUpdated();
    const oldSample = sampUpdEvt.detail.old;
    const newSample = sampUpdEvt.detail.new;
    if (!newSample) {
      return;
    }

    if (ignoreSample(oldSample.name) && ignoreSample(newSample.name)) {
      return;
    }

    if (newSample.status === oldSample.status &&
      newSample.messageBody === oldSample.messageBody &&
      newSample.messageCode === oldSample.messageCode &&
      newSample.value === oldSample.value) {
      return;
    }

    updateInHierarchy(hierarchy,
      utils.getSubjectAbsolutePathFromSampleName(newSample.name),
      newSample);
    shouldRerender = true;
  }); // sample update event listener
}); // "hierarchyLoad" event listener
