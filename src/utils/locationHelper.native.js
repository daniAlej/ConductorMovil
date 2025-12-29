// src/utils/locationHelper.native.js
import * as Location from 'expo-location';

/**
 * Helper para manejar subscripciones de ubicación en MOBILE
 * Usa expo-location directamente
 */

export const startLocationTracking = async (callback, options = {}) => {
    const {
        enableHighAccuracy = true,
        timeInterval = 3000,
        distanceInterval = 0,
    } = options;

    console.log('📍 [NATIVE] Iniciando tracking de ubicación...');

    const subscription = await Location.watchPositionAsync(
        {
            accuracy: enableHighAccuracy
                ? Location.Accuracy.Balanced
                : Location.Accuracy.Low,
            timeInterval,
            distanceInterval,
        },
        callback
    );

    console.log('✅ [NATIVE] Tracking iniciado');

    return subscription;
};

export const requestPermissions = async () => {
    console.log('📍 [NATIVE] Solicitando permisos de ubicación...');
    return await Location.requestForegroundPermissionsAsync();
};
