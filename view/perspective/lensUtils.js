/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * DO NOT MODIFY THIS FILE. WE CANNOT GUARANTEE THAT YOUR LENS WILL WORK ONCE
 * IT IS INSTALLED INTO A REFOCUS INSTALLATION.
 */
const lensUtils = {
  badStatusArrayWorstToBest:
    ['Critical', 'Invalid', 'Timeout', 'Warning', 'Info'],
  statusArrayWorstToBest:
    ['Critical', 'Invalid', 'Timeout', 'Warning', 'Info', 'OK'],
  statuses: {
    Critical: 'Critical',
    Invalid: 'Invalid',
    Timeout: 'Timeout',
    Warning: 'Warning',
    Info: 'Info',
    OK: 'OK',
  },
  copyObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  },
  /*
   * Derive Functions (use with lensUtils.transform)
   */
  derive: {
    subject: {
      /*
       * Add a "statusChangedAt" attribute to a subject with samples,
       * assigning its value to be the most recent "statusChangedAt" time of
       * all its samples.
       */
      mostRecentStatusChangedAt(subject) {
        if (subject.samples && Object.keys(subject.samples).length) {
          subject.statusChangedAt = Object.keys(subject.samples)
            .map((s) => subject.samples[s])
            .sort(lensUtils.sort.sample.statusChangedAtDescending)
            [0].statusChangedAt;
        }
      },
      /*
       * Add a "statusCounts" attribute to a subject with samples, counting
       * the number of samples by status.
       */
      statusCounts(subject) {
        if (subject.samples && Object.keys(subject.samples).length) {
          subject.statusCounts = {};
          lensUtils.statusArrayWorstToBest.forEach((s) => subject.statusCounts[s] = 0);
          Object.keys(subject.samples).forEach((s) => {
            const sam = subject.samples[s];
            subject.statusCounts[sam.status]++;
          });
        }
      },
      /*
       * Add a "status" attribute to a subject with samples, assigning its
       * value to be the worst status of all its samples.
       */
      worstStatus(subject) {
        if (subject.samples && Object.keys(subject.samples).length) {
          subject.status = Object.keys(subject.samples)
            .map((s) => subject.samples[s])
            .sort(lensUtils.sort.sample.statusWorstToBestNameAscending)
            [0].status;
        }
      },
      /*
       * Add a "status" attribute to a subject with samples, assigning its
       * value to be the worst status of all its samples, and add a
       * "descendentStatus" attribute to a subject with children, assigning
       * its value to be the worst status of all its children.
       */
      worstStatusAndDescendentStatus(subject) {
        if (subject.samples && Object.keys(subject.samples).length) {
          subject.status = Object.keys(subject.samples)
            .map((s) => subject.samples[s])
            .sort(lensUtils.sort.sample.statusWorstToBestNameAscending)
            [0].status;
        }
        if (subject.children) {
          const descendents = subject.children.sort((a, b) => {
            const asorter = lensUtils.statusArrayWorstToBest
              .indexOf(a.status || a.descendentStatus) + '#' + a.absolutePath;
            const bsorter = lensUtils.statusArrayWorstToBest
              .indexOf(b.status || b.descendentStatus) + '#' + b.absolutePath;
            return lensUtils.sort.ascending(asorter, bsorter);
          });
          subject.descendentStatus = descendents[0].status;
        }
      },
    },
  },
  /*
   * Constants to help shorten your references to the refocus.lens.* events.
   */
  evt: {
    hLoad: 'refocus.lens.hierarchyLoad',
    load: 'refocus.lens.load',
    sampAdd: 'refocus.lens.realtime.sample.add',
    sampRem: 'refocus.lens.realtime.sample.remove',
    sampUpd: 'refocus.lens.realtime.sample.update',
    subjAdd: 'refocus.lens.realtime.subject.add',
    subjRem: 'refocus.lens.realtime.subject.remove',
    subjUpd: 'refocus.lens.realtime.subject.update',
  },
  /*
   * Filter Functions
   */
  filter: {
    /*
     * Sample Filter Functions
     */
    sample: {
      /*
       * Filters a sample array returning only those sample with status !=
       * "OK".
       */
      notOK(sample, idx, arr) {
        return sample.status !== statuses.OK;
      },
      /*
       * Filters a sample array returning only those sample with status =
       * "OK".
       */
      onlyOK(sample, idx, arr) {
        return sample.status === statuses.OK;
      },
    },
    /*
     * Subjet Filter Functions
     */
    subject: {
      /*
       * Filters a subject array returning only those subjects which have one
       * or more samples, where at least one of the subjects' samples has a
       * status != "OK".
       */
      notOK(subject, idx, arr) {
        const keys = Object.keys(subject.samples);
        if (keys.length === 0) {
          return false;
        }

        keys.forEach((key) => {
          const st = subject.samples[key].status;
          if (badStatusArrayWorstToBest.indexOf(st) >= 0) {
            return true;
          }
        });

        return false;
      },
      /*
       * Filters a subject array returning only those subjects which have one
       * or more samples, where *all* of the subjects' samples have status =
       * "OK".
       */
      allOK(subject, idx, arr) {
        const keys = Object.keys(subject.samples);
        if (keys.length === 0) {
          return false;
        }

        keys.forEach((key) => {
          if (subject.samples[key].status !== statuses.OK) {
            return false;
          }
        });

        return true;
      },
    },
  },
  /*
   * Return a compact description of the time elapsed over the number of
   * milliseconds provided. The result always starts with an integer which
   * is followed by a single letter representing the unit: "s" for second, "m"
   * for minute, "h" for hour, "d" for day and "w" for week.
   *
   * @param {Integer} ms - The number of milliseconds
   * @returns {String} - A compact description of the time elapsed
   */
  formatElapsed(ms) {
    const ONE_SECOND_IN_MILLIS = 1000;
    const ONE_MINUTE_IN_SECONDS = 60;
    const ONE_HOUR_IN_MINUTES = 60;
    const ONE_DAY_IN_HOURS = 24;
    const ONE_WEEK_IN_DAYS = 7;
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
  },
  /*
   * Comparator Functions
   */
  sort: {
    ascending(a, b) {
      if (a > b) {
        return 1;
      }

      if (a < b) {
        return -1;
      }

      return 0;
    },
    descending(a, b) {
      if (a > b) {
        return -1;
      }

      if (a < b) {
        return 1;
      }

      return 0;
    },
    /*
     * Sample Comparator Functions
     */
    sample: {
      /*
       * Sorts an array of samples in ascending order by name.
       */
      nameAscending(a, b) {
        return lensUtils.sort.ascending(a.name, b.name);
      },
      /*
       * Sorts an array of samples in by status (worst to best) then within
       * status in ascending order by sample name.
       */
      statusWorstToBestNameAscending(a, b) {
        const asorter =
          lensUtils.statusArrayWorstToBest.indexOf(a.status) + '#' + a.name;
        const bsorter =
          lensUtils.statusArrayWorstToBest.indexOf(b.status) + '#' + b.name;
        return lensUtils.sort.ascending(asorter, bsorter);
      },
      /*
       * Sorts an array of samples in descending order by statusChangedAt.
       */
      statusChangedAtDescending(a, b) {
        return lensUtils.sort.descending(
          a.statusChangedAt, b.statusChangedAt);
      },
    },
    /*
     * Subject Comparator Functions
     */
    subject: {
      /*
       * Sorts an array of subjects in ascending order by absolutePath.
       */
      absolutePathAscending(a, b) {
        return lensUtils.sort.ascending(a.absolutePath, b.absolutePath);
      },
    },
    /*
     * Tag Comparator Functions
     */
    tag: {
      nameAscending(a, b) {
        return lensUtils.sort.ascending(a.name, b.name);
      },
    }
  },
  /*
   * Returns a copy of the hierarchy with new derived fields based on the
   * attribute derivation callback functions provided.
   */
  transform(subj) {
    function recurse(subject) {
      if (subject.children) {
        subject.children.forEach((child) => {
          recurse(child);
        });
      }
      deriveFns.forEach((fn) => {
        fn(subject);
      });
    }

    const h = lensUtils.copyObject(subj);
    let deriveFns = [];
    for (let i = 1; i < arguments.length; i++) {
      deriveFns.push(arguments[i]);
    }

    recurse(h);
    return h;
  },
  /*
   * Recursively traverse the hierarchy (depth-first traversal) and execute
   * the callback function you provide for every subject in the hierarchy. If
   * you do not provide a comparator function argument, subject siblings will
   * be sorted using the sort function
   * lensUtils.sort.subject.absolutePathAscending. The callback function
   * argument takes one argument, a reference to the current subject.
   * Best practice: do not modify the subject from your callback function.
   */
  traverseSubjects(subj, callback, comparator) {
    callback(subj);
    if (subj.children) {
      subj.children
      .sort(comparator || lensUtils.sort.subject.absolutePathAscending)
      .forEach((child) => {
        lensUtils.traverseSubjects(child, callback, comparator);
      });
    }
  },
};
