import React, { Component } from 'react';
import { connect } from 'react-redux';
import throttle from 'lodash/throttle';
import sortBy from 'lodash/fp/sortBy';
import last from 'lodash/last';

import FlameChart from '../components/FlameChart';
import NetworkChart from '../components/NetworkChart';
import ActivityDetail from '../components/ActivityDetail';
import ThreadDetail from '../components/ThreadDetail';
import WithDropTarget from './WithDropTarget';
import WithEventListeners from '../components/WithEventListeners';

import { MAX_TIME_INTO_FUTURE } from '../constants/defaultParameters';
import {
  visibleThreadLevels,
  rankThreadsByAttention
} from '../utilities/timelineChart';
import { getTimeline } from '../reducers/timeline';
import { getUser } from '../reducers/user';
import { layout } from '../styles';
import zoom from '../utilities/zoom';
import pan from '../utilities/pan';
import {
  updateActivity,
  updateEvent,
  createThread,
  collapseThread,
  expandThread
} from '../actions';

import type { Activity } from '../types/Activity';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 4 * WEEK; // ⚠️ not a real month

// minTime is smallest timestamp in the entire timeline
// maxTime is largest timestamp in the entire timeline
// leftBoundaryTime is timestamp of left bound of current view
// rightBoundaryTime is timestamp of right bound of current view

type Thread = {
  id: string,
  name: string,
  __typename: 'Thread',
  activities: (?Activity)[]
};

type Props = {
  trace_id: string,
  minTime: number,
  maxTime: number,
  focusedBlockActivity_id: ?string,
  activities: { [string]: Activity },
  threads: (?Thread)[],
  toggleThread: () => mixed
};

type State = {
  leftBoundaryTime: number,
  rightBoundaryTime: number,
  topOffset: number,
  threadModal_id: ?number
};

class Timeline extends Component<Props, State> {
  state = {
    leftBoundaryTime: 1506456399223.1394,
    rightBoundaryTime: 1506482474608.5562,
    topOffset: 0,
    composingZoomChord: false
  };

  constructor(props) {
    super(props);

    const savedTimes = {
      lbt: localStorage.getItem('lbt'),
      rbt: localStorage.getItem('rbt')
    };
    const lbt = savedTimes.lbt && Number.parseFloat(savedTimes.lbt);
    const rbt = savedTimes.rbt && Number.parseFloat(savedTimes.rbt);

    if (lbt && rbt) {
      this.state.leftBoundaryTime = lbt;
      this.state.rightBoundaryTime = rbt;
    }

    props.addCommand({
      action: command => {
        console.log(`command`, command);
        this.zoomTo(command.timePeriod);
      },
      copy: 'zoom to...',
      parameters: [
        {
          key: 'timePeriod',
          placeholder: 'time period',
          selector: () => [
            { name: 'now', value: 'now' },
            { name: 'the last day', value: 'day' },
            { name: 'the last week', value: 'week' },
            { name: 'the last month', value: 'month' }
          ],
          itemStringKey: 'name',
          itemReturnKey: 'value'
        }
      ]
    });
  }

  zoomTo(timePeriod) {
    switch (timePeriod) {
      // shows about the last 10 minutes
      case 'now':
        this.setState({
          leftBoundaryTime: Date.now() - 10 * MINUTE,
          rightBoundaryTime: Date.now() + MAX_TIME_INTO_FUTURE
        });
        break;
      case 'day':
        this.setState({
          leftBoundaryTime: Date.now() - 1 * DAY,
          rightBoundaryTime: Date.now() + MAX_TIME_INTO_FUTURE
        });
        break;
      case 'week':
        this.setState({
          leftBoundaryTime: Date.now() - 1 * WEEK,
          rightBoundaryTime: Date.now() + MAX_TIME_INTO_FUTURE
        });
        break;
      case 'month':
        this.setState({
          leftBoundaryTime: Date.now() - 1 * MONTH,
          rightBoundaryTime: Date.now() + MAX_TIME_INTO_FUTURE
        });

        break;
      default:
        break;
    }
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
      this.props.minTime
    );

    this.setState(
      { leftBoundaryTime, rightBoundaryTime },
      this.setLocalStorage
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
      this.props.minTime
    );
    this.setState(
      { leftBoundaryTime, rightBoundaryTime, topOffset },
      this.setLocalStorage
    );
  };

  showThreadDetail = (id: number) => {
    this.setState({ threadModal_id: id });
  };

  closeThreadDetail = () => {
    this.setState({ threadModal_id: null });
  };

  /**
   * 💁 I didn't want left and right boundary times to be part of redux, because they were changing too fast for a super silky smooth animation, but I did want them to persist through reloads. So, when this component will mount, if they exist in localStorage, they will take that initial value. They are then set in localStorage at most once a second.
   *
   */
  setLocalStorage = throttle(() => {
    if (
      typeof this.state.leftBoundaryTime === 'number' &&
      this.state.leftBoundaryTime !== NaN &&
      typeof this.state.rightBoundaryTime === 'number' &&
      this.state.rightBoundaryTime !== NaN
    ) {
      localStorage.setItem('lbt', this.state.leftBoundaryTime);
      localStorage.setItem('rbt', this.state.rightBoundaryTime);
    }
  }, 1000);

  render() {
    const props = this.props;
    const focusedActivity =
      props.focusedBlockActivity_id &&
      props.activities[props.focusedBlockActivity_id];

    const rightBoundaryTime = this.state.rightBoundaryTime || props.maxTime;
    const leftBoundaryTime = this.state.leftBoundaryTime || props.minTime;

    const threads = Array.isArray(props.threads)
      ? {}
      : props.settings.attentionDrivenThreadOrder
        ? rankThreadsByAttention(props.attentionShifts, props.threads)
        : props.threads;

    return (
      <WithEventListeners
        node={document}
        eventListeners={[
          [
            'keyup',
            e => {
              if (e.target.nodeName !== 'INPUT') {
                if (this.state.composingZoomChord) {
                  switch (e.key) {
                    case 'n':
                      this.setState({ composingZoomChord: false });
                      this.zoomTo('now');
                      break;
                    case 'd':
                      this.setState({ composingZoomChord: false });
                      this.zoomTo('day');
                      break;
                    case 'w':
                      this.setState({ composingZoomChord: false });
                      this.zoomTo('week');
                      break;
                    case 'm':
                      this.setState({ composingZoomChord: false });
                      this.zoomTo('month');
                      break;
                    default:
                      this.setState({ composingZoomChord: false });
                      break;
                  }
                } else if (e.key === 'n') {
                  this.zoomTo('now');
                } else if (e.key === 'z') {
                  this.setState({ composingZoomChord: true });
                }
              }
            }
          ]
        ]}
      >
        {() => (
          <>
            <div
              style={{
                position: 'relative',
                height: `calc(${window.innerHeight}px - ${layout.headerHeight})`
              }}
            >
              <NetworkChart
                leftBoundaryTime={leftBoundaryTime}
                rightBoundaryTime={rightBoundaryTime}
                searchTerms={props.searchTerms}
                mantras={props.mantras}
                tabs={props.tabs}
              />
              <WithDropTarget
                targetName="flame-chart"
                threads={props.threads}
                trace_id={props.trace_id}
              >
                <FlameChart
                  activities={props.activities}
                  uniformBlockHeight={props.settings.uniformBlockHeight}
                  attentionShifts={props.attentionShifts}
                  blocks={props.blocks}
                  categories={props.user.categories}
                  currentAttention={last(props.attentionShifts).thread_id}
                  leftBoundaryTime={leftBoundaryTime}
                  maxTime={props.maxTime}
                  minTime={props.minTime}
                  modifiers={props.modifiers}
                  pan={this.pan}
                  rightBoundaryTime={rightBoundaryTime}
                  showAttentionFlows={props.settings.attentionFlows}
                  showThreadDetail={this.showThreadDetail}
                  showSuspendResumeFlows={props.settings.suspendResumeFlows}
                  // threadLevels={props.threadLevels}
                  threadLevels={
                    props.activities && props.settings.reactiveThreadHeight
                      ? visibleThreadLevels(
                        props.blocks,
                        props.activities,
                        leftBoundaryTime,
                        rightBoundaryTime,
                        props.threads
                      )
                      : props.threadLevels
                  }
                  threads={threads}
                  toggleThread={props.toggleThread}
                  topOffset={this.state.topOffset || 0}
                  updateEvent={props.updateEvent}
                  zoom={this.zoom}
                />
              </WithDropTarget>
              <ThreadDetail
                closeThreadDetail={this.closeThreadDetail}
                id={this.state.threadModal_id}
                name={
                  this.state.threadModal_id &&
                  props.threads[this.state.threadModal_id].name
                }
                activities={props.activities}
              />
              {props.focusedBlockActivity_id && (
                <ActivityDetail
                  activity={{
                    id: props.focusedBlockActivity_id,
                    ...focusedActivity
                  }}
                  activityBlocks={props.blocks.filter(block => block.activity_id === props.focusedBlockActivity_id)}
                  categories={props.user.categories}
                  updateActivity={props.updateActivity}
                  trace_id={props.trace_id}
                  threadLevels={props.threadLevels}
                />
              )}
            </div>
            {this.state.composingZoomChord && (
              <div style={{ position: 'fixed', bottom: 0, left: 0 }}>
                Zoom to... (Waiting for second key of chord)
              </div>
            )}
          </>
        )}
      </WithEventListeners>
    );
  }
}

export default connect(
  state => ({
    activities: getTimeline(state).activities,
    blocks: getTimeline(state).blocks,
    focusedBlockActivity_id: getTimeline(state).focusedBlockActivity_id,
    mantras: getUser(state).mantras,
    minTime: getTimeline(state).minTime,
    maxTime: getTimeline(state).maxTime,
    modifiers: state.modifiers,
    threadLevels: getTimeline(state).threadLevels,
    threads: getTimeline(state).threads,
    lastCategory_id: getTimeline(state).lastCategory_id,
    lastThread_id: getTimeline(state).lastThread_id,
    attentionShifts: getUser(state).attentionShifts,
    searchTerms: getUser(state).searchTerms,
    settings: state.settings,
    tabs: getUser(state).tabs
  }),
  dispatch => ({
    createThread: (name, rank) => dispatch(createThread(name, rank)),
    toggleThread: (id, isCollapsed = false) =>
      dispatch(isCollapsed ? expandThread(id) : collapseThread(id)),
    updateActivity: (id, updates) => dispatch(updateActivity(id, updates)),
    updateEvent: (id, updates) => dispatch(updateEvent(id, updates))
  })
)(Timeline);
