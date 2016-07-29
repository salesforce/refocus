/**
 * view/admin/reducers/refocusReducer.js
 *
 * API reducer: given state and action, return new state,
 * based on API-related action
 */

import * as constants from '../constants';
import createReducer from '../utils/create-reducer';

// subjects and aspects hold the non-deleted subjects/aspects
// subject/aspect hold the fetched/posted subject/aspect
const initialState = {
  defaultAspectRange: false,
  error: null,
  message: null,
  samples: [],
  subjects: [],
  aspects: [],
  sample: {},
  subject: {},
  aspect: {},
};

const actionHandlers = {
  [constants.SHOW_MESSAGE]: (state, action) => ({ message: action.message }),
  [constants.SHOW_ERROR]: (state, action) => ({
    ...state, ...{ error: action.error }
  }),
  [constants.HIDE_ERROR]: (state) => ({ ...state, ...{ error: null } }),
  [constants.HIDE_MESSAGE]: (state) => ({ ...state, ...{ message: null } }),
  [constants.ASPECT_RANGE_FORMAT]: (state, action) => ({
    aspectRangeFormat: action.aspectRangeFormat
  }),
  // toggle on or off
  [constants.DEFAULT_ASPECT_RANGE]: (state, action) => ({
    defaultAspectRange: action.bool
  }),
  // resource_dependent
  [constants.FETCH_SAMPLE]: (state, action) => ({ sample: action.sample }),
  [constants.FETCH_ASPECT]: (state, action) => ({
    aspect: action.aspect
  }),
  [constants.FETCH_SUBJECT]: (state, action) => ({ subject: action.subject }),
  // take out deleted aspect from aspects
  // may be coming from the details page, for which state.aspects == null
  [constants.DELETE_ASPECT]: (state, action) => {
    return (state.aspects.length) ? {
      aspects: state.aspects.filter((aspect) => {
        return aspect.id !== action.aspect.id;
      })
    } : null;
  },
  // take out deleted subject from subjects
  [constants.DELETE_SUBJECT]: (state, action) => {
    return (state.subjects.length) ? {
      subjects: state.subjects.filter((subject) => {
        return subject.id !== action.subject.id;
      })
    } : null;
  },
  [constants.PUT_SAMPLE]: (state, action) => ({ sample: action.sample }),
  [constants.PUT_ASPECT]: (state, action) => ({ aspect: action.aspect }),
  [constants.PUT_SUBJECT]: (state, action) => ({ subject: action.subject }),
  // patch
  [constants.PATCH_SAMPLE]: (state, action) => ({ sample: action.sample }),
  [constants.PATCH_ASPECT]: (state, action) => ({ aspect: action.aspect }),
  [constants.PATCH_SUBJECT]: (state, action) => ({ subject: action.subject }),
  // fetch multiple
  [constants.FETCH_SAMPLES]: (state, action) => ({ samples: action.samples }),
  [constants.FETCH_ASPECTS]: (state, action) => ({ aspects: action.aspects }),
  [constants.FETCH_SUBJECTS]: (state, action) => ({
    subjects: action.subjects
  }),
  // post resource
  [constants.POST_SAMPLE]: (state, action) => ({ sample: action.sample }),
  [constants.POST_ASPECT]: (state, action) => ({ aspect: action.aspect }),
  [constants.POST_SUBJECT]: (state, action) => ({ subject: action.subject }),
};

export default createReducer(initialState, actionHandlers);
