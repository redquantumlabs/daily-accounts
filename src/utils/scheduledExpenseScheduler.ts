import notifee, { TriggerType, TimestampTrigger, AndroidImportance } from '@notifee/react-native';
import { SCHEDULED_EXPENSES_TRIGGER_PREFIX, SCHEDULED_EXPENSES_CHANNEL_ID } from './scheduledExpenseConstants';

export interface ScheduledExpenseTriggerItem {
  id: string;
  amount: number;
  description: string;
  expenseDate: string;
  scheduleDate: string;
  isProcessed: boolean;
}

export const ensureScheduledExpenseChannel = async () => {
  await notifee.createChannel({
    id: SCHEDULED_EXPENSES_CHANNEL_ID,
    name: 'Scheduled Expenses',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
};

export const scheduleExpenseTrigger = async (item: ScheduledExpenseTriggerItem, currency: string = '$') => {
  if (item.isProcessed) return;

  const triggerTime = new Date(item.scheduleDate).getTime();
  const now = Date.now();

  // If already passed, do not schedule future trigger
  if (triggerTime <= now) return;

  try {
    await ensureScheduledExpenseChannel();

    const triggerId = `${SCHEDULED_EXPENSES_TRIGGER_PREFIX}${item.id}`;
    await notifee.cancelTriggerNotification(triggerId).catch(() => {});

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTime,
      alarmManager: { allowWhileIdle: true },
    };

    const expenseDateFormatted = new Date(item.expenseDate).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    await notifee.createTriggerNotification(
      {
        id: triggerId,
        title: 'Scheduled Expense Added',
        body: `${item.description} (${currency}${item.amount}) has been recorded for ${expenseDateFormatted}.`,
        android: {
          channelId: SCHEDULED_EXPENSES_CHANNEL_ID,
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          circularLargeIcon: true,
          showTimestamp: true,
          pressAction: { id: 'default' },
        },
      },
      trigger
    );
  } catch (error) {
    console.warn('[scheduleExpenseTrigger] Failed to schedule trigger:', error);
  }
};

export const cancelScheduledExpenseTrigger = async (id: string) => {
  try {
    const triggerId = `${SCHEDULED_EXPENSES_TRIGGER_PREFIX}${id}`;
    await notifee.cancelTriggerNotification(triggerId);
  } catch (error) {
    console.warn('[cancelScheduledExpenseTrigger] Failed to cancel trigger:', error);
  }
};
