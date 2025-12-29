// src/utils/locationHelper.web.js

/**
 * Helper para manejar subscripciones de ubicación en la WEB
 * Usa la API del navegador en lugar de expo-location
 */

export const startLocationTracking = async (callback, options = {}) => {
    const { enableHighAccuracy = true } = options;

    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Tu navegador no soporta geolocalización'));
            return;
        }

        console.log('📍 [WEB] Iniciando tracking de ubicación...');

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    coords: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        altitude: position.coords.altitude,
                        accuracy: position.coords.accuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                    },
                };

                callback(location);
            },
            (error) => {
                console.error('❌ [WEB] Error en geolocalización:', error);
            },
            {
                enableHighAccuracy,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        console.log('✅ [WEB] Tracking iniciado (watchId:', watchId, ')');

        // Retornar un objeto que simula la interfaz de expo-location
        resolve({
            remove: () => {
                console.log('🛑 [WEB] Deteniendo tracking (watchId:', watchId, ')');
                navigator.geolocation.clearWatch(watchId);
            },
        });
    });
};

export const requestPermissions = async () => {
    // En la web, los permisos se solicitan automáticamente al llamar getCurrentPosition
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ status: 'denied' });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            () => {
                console.log('✅ [WEB] Permisos de ubicación concedidos');
                resolve({ status: 'granted' });
            },
            (error) => {
                console.error('❌ [WEB] Permisos de ubicación denegados:', error);
                resolve({ status: 'denied' });
            }
        );
    });
};
