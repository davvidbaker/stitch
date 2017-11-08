// @flow

import React, { Component } from 'react';
import { connect } from 'react-redux';
// flow-ignore
import throttle from 'lodash/throttle';
import sortBy from 'lodash/sortBy';

import FlameChart from 'components/FlameChart';
import ActivityDetail from 'components/ActivityDetail';
import ThreadDetail from 'components/ThreadDetail';
import EventForm from 'components/EventForm';
import WithDropTarget from 'containers/WithDropTarget';
import WithEventListeners from 'components/WithEventListeners';
import { InputFromButton } from 'components/Button';

import { MAX_TIME_INTO_FUTURE } from 'constants.js';
import { updateActivity, createThread } from 'actions';
import { getTimeline } from 'reducers/timeline';
import { layout } from 'styles';

import zoom from 'utilities/zoom';
import pan from 'utilities/pan';

import type { Activity } from 'types/Activity';

// minTime is smallest timestamp in the entire timeline
// maxTime is largest timestamp in the entire timeline
// leftBoundaryTime is timestamp of left bound of current view
// rightBoundaryTime is timestamp of right bound of current view

type Thread = {
  id: string,
  name: string,
  __typename: 'Thread',
  activities: (?Activity)[],
};

type Props = {
  traceId: string,
  minTime: number,
  maxTime: number,
  focusedActivityId: ?string,
  activities: { [string]: Activity },
  threads: (?Thread)[],
};

type State = {
  leftBoundaryTime: number,
  rightBoundaryTime: number,
  topOffset: number,

  threadModal_id: ?number,
};

class Timeline extends Component<Props, State> {
  state = {
    leftBoundaryTime: 1506456399223.1394,
    rightBoundaryTime: 1506482474608.5562,
    topOffset: 0,
    eventListeners: null,
  };

  constructor(props) {
    super(props);
    const savedTimes = {
      lbt: localStorage.getItem('lbt'),
      rbt: localStorage.getItem('rbt'),
    };
    const lbt = savedTimes.lbt && Number.parseFloat(savedTimes.lbt);
    const rbt = savedTimes.rbt && Number.parseFloat(savedTimes.rbt);

    if (lbt && rbt) {
      this.state.leftBoundaryTime = lbt;
      this.state.rightBoundaryTime = rbt;
    }
  }

  // shows about the last 10 minutes
  showRightNow() {
    this.setState({
      leftBoundaryTime: Date.now() - 10 * 60 * 1000,
      rightBoundaryTime: Date.now() + MAX_TIME_INTO_FUTURE,
    });
  }

  zoom = (dy, offsetX, zoomCenterTime, canvasWidth) => {
    const { leftBoundaryTime, rightBoundaryTime } = zoom(
      dy,
      offsetX,
      zoomCenterTime,
      this.state.leftBoundaryTime,
      this.state.rightBoundaryTime,
      canvasWidth,
      Date.now(),
      this.props.minTime,
    );

    this.setState(
      { leftBoundaryTime, rightBoundaryTime },
      this.setLocalStorage,
    );
  };

  pan = (dx, dy, canvasWidth) => {
    const { leftBoundaryTime, rightBoundaryTime, topOffset } = pan(
      dx,
      this.props.shiftModifier && dy,
      this.state.leftBoundaryTime,
      this.state.rightBoundaryTime,
      canvasWidth,
      this.state.topOffset,
      Date.now(),
      this.props.minTime,
    );
    this.setState(
      { leftBoundaryTime, rightBoundaryTime, topOffset },
      this.setLocalStorage,
    );
  };

  showThreadDetail = (id: number) => {
    this.setState({ threadModal_id: id });
  };

  closeThreadDetail = () => {
    console.log('trying to close thread detail');
    this.setState({ threadModal_id: null });
  };

  /**
   * 💁 I didn't want left and right boundary times to be part of redux, because they were changing too fast for a super silky smooth animation, but I did want them to persist through reloads. So, when this component will mount, if they exist in localStorage, they will take that initial value. They are then set in localStorage at most once a second. 
   *
   */
  setLocalStorage = throttle(() => {
    console.log(typeof this.state.leftBoundaryTime === 'number');
    if (
      typeof this.state.leftBoundaryTime === 'number' &&
      this.state.leftBoundaryTime !== NaN &&
      typeof this.state.rightBoundaryTime === 'number' &&
      this.state.rightBoundaryTime !== NaN
    ) {
      console.log('setting ls');
      localStorage.setItem('lbt', this.state.leftBoundaryTime);
      localStorage.setItem('rbt', this.state.rightBoundaryTime);
    }
  }, 1000);

  render() {
    const props = this.props;
    const focusedActivity =
      props.focusedActivityId && props.activities[props.focusedActivityId];

    return (
      <WithEventListeners
        node={document}
        eventListeners={[
          [
            'keyup',
            e => {
              if (e.key === 'n' && e.target.nodeName !== 'INPUT') {
                this.showRightNow();
              }
            },
          ],
        ]}
      >
        {() => (
          <div
            style={{
              position: 'relative',
              height: `calc(${window.innerHeight}px - ${layout.headerHeight})`,
            }}
          >
            <WithDropTarget
              targetName="flame-chart"
              threads={props.threads}
              traceId={props.traceId}
            >
              <FlameChart
                activities={props.activities}
                threads={props.threads}
                threadLevels={props.threadLevels}
                categories={props.user.categories}
                maxTime={props.maxTime}
                minTime={props.minTime}
                leftBoundaryTime={this.state.leftBoundaryTime || props.minTime}
                rightBoundaryTime={
                  this.state.rightBoundaryTime || props.maxTime
                }
                pan={this.pan}
                showThreadDetail={this.showThreadDetail}
                topOffset={this.state.topOffset || 0}
                zoom={this.zoom}
              />
            </WithDropTarget>
            <InputFromButton
              submit={(name: string) => {
                console.log('name', name);
                props.createThread(name, props.threads.length);
              }}
            >
              New Thread
            </InputFromButton>
            <ThreadDetail
              closeThreadDetail={this.closeThreadDetail}
              id={this.state.threadModal_id}
              name={
                this.state.threadModal_id &&
                props.threads.find(t => t.id === this.state.threadModal_id).name
              }
            />
            {props.focusedActivityId && (
              <ActivityDetail
                activity={{
                  id: props.focusedActivityId,
                  ...focusedActivity,
                }}
                categories={props.user.categories}
                updateActivity={props.updateActivity}
                traceId={props.traceId}
                threadLevels={props.threadLevels}
              />
            )}
            <div>
              <EventForm
                traceId={props.traceId}
                threads={props.threads}
                categories={props.categories}
                lastCategory={props.lastCategory}
              />
            </div>
          </div>
        )}
      </WithEventListeners>
    );
  }
}

export default // flow-ignore
connect(
  state => ({
    activities: getTimeline(state).activities,
    focusedActivityId: getTimeline(state).focusedActivityId,
    minTime: getTimeline(state).minTime,
    maxTime: getTimeline(state).maxTime,
    threadLevels: getTimeline(state).threadLevels,
    threads: sortBy(getTimeline(state).threads, t => t.rank),
    lastCategory: getTimeline(state).lastCategory,
  }),
  dispatch => ({
    createThread: (name, rank) => dispatch(createThread(name, rank)),
    updateActivity: (id, obj) => dispatch(updateActivity(id, obj)),
  }),
)(Timeline);
