import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import 'regenerator-runtime/runtime';
import createSagaMiddleware from 'redux-saga';
import { routerReducer, routerMiddleware } from 'react-router-redux';
import createHistory from 'history/createBrowserHistory';

import {
  timeline,
  modifiers,
  user,
  operand,
  todosVisible,
  activityDetailsVisible
} from 'reducers';
import { getTimeline } from 'reducers/timeline';
import { loadState, saveState } from 'utilities';
import mainSaga from 'sagas';

// eslint-disable-next-line no-underscore-dangle
const composeEnhancers =
  (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
      actionsBlacklist: ['BLOCK_HOVER']
    })) ||
  compose;

// create the saga middleware
const sagaMiddleware = createSagaMiddleware();

// Create a history of your choosing (we're using a browser history in this case)
export const history = createHistory();

// Build the middleware for intercepting and dispatching navigation actions
const rMiddleware = routerMiddleware(history);

const persistedState = loadState();

const rootReducer = combineReducers({
  timeline,
  modifiers,
  user,
  operand,
  todosVisible,
  activityDetailsVisible,
  router: routerReducer
});
const store = createStore(
  rootReducer,
  persistedState,
  composeEnhancers(
    applyMiddleware(rMiddleware),
    applyMiddleware(sagaMiddleware)
  )
);

sagaMiddleware.run(mainSaga);

store.subscribe(() => {
  saveState({
    timeline: getTimeline(store.getState())
  });
});

export default store;
