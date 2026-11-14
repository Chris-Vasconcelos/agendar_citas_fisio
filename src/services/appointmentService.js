import { localAppointmentApi } from '../local/pocketbaseClient';

export const fetchAppointments = () => localAppointmentApi.list();
export const saveAppointment = (payload, editingAppointmentId) => localAppointmentApi.save(payload, editingAppointmentId);
export const cancelAppointment = (appointmentId) => localAppointmentApi.cancel(appointmentId);
