/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import BackgroundFetch from 'react-native-background-fetch';
import { performBackgroundTasks } from './src/tasks/backgroundTask';

const HeadlessTask = async (event: any) => {
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

AppRegistry.registerComponent(appName, () => App);
