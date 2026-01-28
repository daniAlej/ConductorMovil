import { Platform } from 'react-native';

// Configuración del Backend - Cambia esta IP según tu entorno
const BACKEND_IP = 'https://nylah-unperilous-concerningly.ngrok-free.dev';

const BACKEND_PORT = '';
const API_PATH = '/api';

//URL completa del backend
const BACKEND_URL = `${BACKEND_IP}${API_PATH}`;

//const BACKEND_IP = '192.168.5.214';
//const BACKEND_PORT = '8000';
//const API_PATH = '/api';

// URL completa del backend
//const BACKEND_URL = `http://${BACKEND_IP}:${BACKEND_PORT}${API_PATH}`;

// Configuración por plataforma
export const BASE_URL = Platform.select({
  android: BACKEND_URL,
  ios: BACKEND_URL,
  default: BACKEND_URL
});
