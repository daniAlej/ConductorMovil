// Ajusta según tu entorno
export const BASE_URL =
  Platform.select({
    android: 'http://192.168.5.19:8000/api',
    ios: 'http://192.168.5.19:8000/api',
    default: 'http://192.168.5.19:8000/api' // ejemplo para dispositivo físico
  });
