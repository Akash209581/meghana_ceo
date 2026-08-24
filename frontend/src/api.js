import axios from 'axios';

// Get the correct API URL based on environment
export function getAPIBaseURL() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
    
    if (isProduction) {
      return `${window.location.origin}/megha/api`;
    }
  }
  
  return 'http://localhost:9000/megha/api';
}

export const API_BASE_URL = getAPIBaseURL();

// Helper to construct full URL for images/photos
export const getPhotoUrl = (photoPath) => {
  if (!photoPath) return '';
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  const finalPath = cleanPath.startsWith('/megha') ? cleanPath : `/megha${cleanPath}`;
  
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}${finalPath}`;
    }
  }
  return `http://localhost:9000${finalPath}`;
};

console.log('Environment:', window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('API Base URL:', API_BASE_URL);
console.log('Hostname:', window.location.hostname);

// Create axios instance with optimized config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
});

// Add retry logic
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    
    if (!config || !config.retry) {
      config.retry = 0;
    }
    
    config.retry += 1;
    
    // Retry up to 2 times on network errors or 5xx errors
    if (config.retry <= 2 && (error.message === 'Network Error' || (error.response && error.response.status >= 500))) {
      // Wait before retrying (exponential backoff: 1s, 2s)
      await new Promise(resolve => setTimeout(resolve, config.retry * 1000));
      return axiosInstance(config);
    }
    
    return Promise.reject(error);
  }
);

const getAuthHeader = () => {
  const pin = localStorage.getItem('adminPin');
  return {
    headers: {
      adminPin: pin,
    },
  };
};

export const authAPI = {
  login: (pin) => axiosInstance.post(`/auth/login`, { pin }),
};

export const tasksAPI = {
  createTask: (taskData) =>
    axiosInstance.post(`/tasks/create`, taskData, getAuthHeader()),
  getAllTasks: () =>
    axiosInstance.get(`/tasks/all`, getAuthHeader()),
  getTasksBySector: (sector) =>
    axiosInstance.get(`/tasks/sector/${sector}`, getAuthHeader()),
  getStats: () =>
    axiosInstance.get(`/tasks/stats`, getAuthHeader()),
  updateTask: (taskId, taskData) =>
    axiosInstance.put(`/tasks/update/${taskId}`, taskData, getAuthHeader()),
  updateTaskStatus: (taskId, statusData) =>
    axiosInstance.put(`/tasks/update/${taskId}`, statusData, getAuthHeader()),
  assignTask: (taskId, assignmentData) =>
    axiosInstance.put(`/tasks/assign/${taskId}`, assignmentData, getAuthHeader()),
  deleteTask: (taskId) =>
    axiosInstance.delete(`/tasks/delete/${taskId}`, getAuthHeader()),
  getTask: (taskId) =>
    axiosInstance.get(`/tasks/${taskId}`, getAuthHeader()),
};

export const whatsappAPI = {
  sendAssignment: (taskId, recipientPhone) =>
    axiosInstance.post(
      `/whatsapp/send-assignment`,
      { taskId, recipientPhone },
      getAuthHeader()
    ),
  getStatus: () =>
    axiosInstance.get(`/whatsapp/status`, getAuthHeader()),
};

export const contactsAPI = {
  getAllContacts: () =>
    axiosInstance.get(`/contacts/all`, getAuthHeader()),
  getContact: (contactId) =>
    axiosInstance.get(`/contacts/${contactId}`, getAuthHeader()),
  createContact: (contactData) =>
    axiosInstance.post(`/contacts/create`, contactData, getAuthHeader()),
  updateContact: (contactId, contactData) =>
    axiosInstance.put(`/contacts/update/${contactId}`, contactData, getAuthHeader()),
  deleteContact: (contactId) =>
    axiosInstance.delete(`/contacts/delete/${contactId}`, getAuthHeader()),
  searchContacts: (query) =>
    axiosInstance.get(`/contacts/search/${query}`, getAuthHeader()),
};

export const settingsAPI = {
  getSettings: () =>
    axiosInstance.get(`/settings/get`),
  updatePin: (currentPin, newPin) =>
    axiosInstance.post(`/settings/update-pin`, { currentPin, newPin }),
  updatePhone: (newPhone) =>
    axiosInstance.post(`/settings/update-phone`, { adminPhone: newPhone }),
  addSector: (newSector) =>
    axiosInstance.post(`/settings/sectors`, { newSector }),
  deleteSector: (sector) =>
    axiosInstance.delete(`/settings/sectors/${encodeURIComponent(sector)}`),
};
