import axios from 'axios';

// IMPORTANT: We use the local IP address because the mobile emulator 
// or physical phone cannot access 'localhost' of the Mac.
export const BASE_URL = 'http://192.168.1.2:8000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    // axios sets Content-Type automatically based on the body
  },
});

// A simple local token manager placeholder
export const setAuthToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};
