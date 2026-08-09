/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import BackgroundFetch from 'react-native-background-fetch';
import { performBackgroundTasks } from './src/tasks/backgroundTask';
import notifee, { EventType } from '@notifee/react-native';

const HeadlessTask = async (event) => {
  const taskId = event.taskId;
  const isTimeout = event.timeout;
  if (isTimeout) {
    BackgroundFetch.finish(taskId);
    return;
  }
  await performBackgroundTasks();
  BackgroundFetch.finish(taskId);
};

BackgroundFetch.registerHeadlessTask(HeadlessTask);

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.DELIVERED) {
    await performBackgroundTasks();
  }
});

AppRegistry.registerComponent(appName, () => App);
