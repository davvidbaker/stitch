import {
  TODOS_TOGGLE,
  ACTIVITY_DETAILS_SHOW,
  ACTIVITY_DETAILS_HIDE
} from 'actions';

import timeline from './timeline';
import modifiers from './modifiers';
import user from './user';
import operand from './operand';

function todosVisible(state = false, action) {
  switch (action.type) {
    case TODOS_TOGGLE:
      return action.bool;
    default:
      return state;
  }
}

function activityDetailsVisible(state = false, action) {
  switch (action.type) {
    case ACTIVITY_DETAILS_SHOW:
      return true;
    case ACTIVITY_DETAILS_HIDE:
      return false;
    default:
      return state;
  }
}

export {
  timeline,
  modifiers,
  user,
  operand,
  todosVisible,
  activityDetailsVisible
};
