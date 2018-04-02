import { call, put, takeEvery, takeLatest, select } from 'redux-saga/effects';
import {
  ACTIVITY_CREATE,
  ACTIVITY_DELETE,
  ACTIVITY_END,
  ACTIVITY_REJECT,
  ACTIVITY_RESOLVE,
  ACTIVITY_RESUME,
  ACTIVITY_SUSPEND,
  ACTIVITY_DETAILS_SHOW,
  ATTENTION_SHIFT,
  CATEGORY_MANAGER_SHOW,
  THREAD_CREATE,
  THREADS_COLLAPSE,
  THREADS_EXPAND,
  TODOS_TOGGLE,
  collapseThread,
  expandThread,
  createActivity,
  createThread,
  deleteActivity,
  endActivity,
  resumeActivity,
  shiftAttention,
  showActivityDetails,
  showCategoryManager,
  suspendActivity,
  toggleTodos
} from 'actions';

import { getTimeline } from 'reducers/timeline';

function* handleCommand({ type, operand, command }) {
  const timeline = yield select(getTimeline);

  switch (command.action) {
    case ACTIVITY_CREATE:
      yield put(
        createActivity({
          name: command.name,
          timestamp: Date.now(),
          description: '',
          thread_id: command.thread_id,
          phase: command.copy.includes('question') ? 'Q' : 'B',
          category_id: command.category_id
        })
      );
      yield put(shiftAttention(command.thread_id, Date.now()));
      break;

    case ACTIVITY_RESUME:
      yield put(
        resumeActivity({
          id: operand.activity_id,
          timestamp: Date.now(),
          message: command.message,
          thread_id: operand.thread_id
        })
      );
      break;

    case ACTIVITY_END:
    case ACTIVITY_REJECT:
    case ACTIVITY_RESOLVE:
      const message = command.message ? command.message : '';
      const eventFlavor = command.action.includes('REJECT')
        ? 'J'
        : command.action.includes('RESOLVE') ? 'V' : 'E';
      yield put(
        endActivity({
          id: operand.activity_id,
          timestamp: Date.now(),
          message,
          thread_id: operand.thread_id,
          eventFlavor
        })
      );
      break;

    case ACTIVITY_DELETE:
      yield put(deleteActivity(operand.activity_id, operand.thread_id));
      break;
    /** 💁 if this isn't obvious, suspension can only happen on the most recent block of an activity (for activities that may have been suspended and resumed already) */
    case ACTIVITY_SUSPEND:
      yield put(
        suspendActivity({
          id: operand.activity_id,
          timestamp: Date.now(),
          message: command.message ? command.message : '',
          thread_id: operand.thread_id
        })
      );
      break;

    case ATTENTION_SHIFT:
      console.log('command', command);
      yield put(shiftAttention(command.thread_id, Date.now()));
      break;

    case ACTIVITY_DETAILS_SHOW:
      yield put(showActivityDetails());
      break;

    case CATEGORY_MANAGER_SHOW:
      yield put(showCategoryManager());
      break;

    case THREAD_CREATE:
      const rank = timeline.threads.length;
      console.log('timeline, rank', timeline, rank);
      yield put(createThread(command.name, rank));
      break;

    case THREADS_COLLAPSE:
      for (let i = 0; i < timeline.threads.length; i++) {
        console.log('timeline', timeline);
        yield put(collapseThread(timeline.threads[i].id));
      }
      break;

    case THREADS_EXPAND:
      for (let i = 0; i < timeline.threads.length; i++) {
        yield put(expandThread(timeline.threads[i].id));
      }
      break;

    case TODOS_TOGGLE:
      const todosVisible = yield select(state => state.todosVisible);
      yield put(toggleTodos(!todosVisible));
      break;

    default:
      break;
  }
}

export default handleCommand;
