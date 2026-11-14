import { localReminderApi } from '../local/pocketbaseClient';

export const fetchReminderRecords = () => localReminderApi.list();
// Opening WhatsApp records only that gesture, never automatic delivery.
export const recordReminderEvent = (appointmentId, startTime, _userId, status) =>
  localReminderApi.save(appointmentId, startTime, status);
