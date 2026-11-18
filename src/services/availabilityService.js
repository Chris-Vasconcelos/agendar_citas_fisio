import { localAvailabilityApi } from '../local/pocketbaseClient';

export const fetchAvailability = () => localAvailabilityApi.list();
export const updateAvailability = (payload) => localAvailabilityApi.save(payload);
