// Standalone constants for backup trigger notification IDs.
// Kept separate to avoid circular imports between notificationScheduler and autoBackupScheduler.
export const BACKUP_TRIGGER_MORNING_ID = 'auto_backup_trigger_morning';
export const BACKUP_TRIGGER_EVENING_ID = 'auto_backup_trigger_evening';
export const BACKUP_TRIGGER_IDS = [BACKUP_TRIGGER_MORNING_ID, BACKUP_TRIGGER_EVENING_ID];
