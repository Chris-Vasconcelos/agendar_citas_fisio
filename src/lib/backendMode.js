// Selected at build time; a server failure never changes the data provider.
export const isLocalBackend = import.meta.env?.VITE_MINA_BACKEND === 'pocketbase';
