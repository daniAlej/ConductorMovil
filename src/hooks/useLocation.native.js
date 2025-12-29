// src/hooks/useLocation.native.js
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Hook personalizado para obtener y rastrear la ubicación del usuario
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.enableHighAccuracy - Usar alta precisión GPS
 * @param {number} options.distanceFilter - Distancia mínima en metros para actualizar (default: 10m)
 * @param {number} options.timeInterval - Intervalo mínimo en ms para actualizar (default: 5000ms)
 * @returns {Object} { location, error, loading }
 */
export const useLocation = (options = {}) => {
    const {
        enableHighAccuracy = true,
        distanceFilter = 10, // Actualizar cada 10 metros
        timeInterval = 5000, // Actualizar cada 5 segundos
    } = options;

    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let subscription;

        const startWatching = async () => {
            try {
                // 1. Solicitar permisos
                console.log('📍 Solicitando permisos de ubicación...');
                const { status } = await Location.requestForegroundPermissionsAsync();

                if (status !== 'granted') {
                    setError('Permisos de ubicación denegados');
                    setLoading(false);
                    console.error('❌ Permisos de ubicación denegados');
                    return;
                }

                console.log('✅ Permisos de ubicación concedidos');

                // 2. Obtener ubicación inicial
                const initialLocation = await Location.getCurrentPositionAsync({
                    accuracy: enableHighAccuracy
                        ? Location.Accuracy.High
                        : Location.Accuracy.Balanced,
                });

                const coords = {
                    latitude: initialLocation.coords.latitude,
                    longitude: initialLocation.coords.longitude,
                    altitude: initialLocation.coords.altitude,
                    accuracy: initialLocation.coords.accuracy,
                    heading: initialLocation.coords.heading,
                    speed: initialLocation.coords.speed,
                };

                console.log('📍 Ubicación inicial obtenida:', coords);
                setLocation(coords);
                setLoading(false);

                // 3. Observar cambios de ubicación
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: enableHighAccuracy
                            ? Location.Accuracy.High
                            : Location.Accuracy.Balanced,
                        distanceInterval: distanceFilter,
                        timeInterval: timeInterval,
                    },
                    (newLocation) => {
                        const newCoords = {
                            latitude: newLocation.coords.latitude,
                            longitude: newLocation.coords.longitude,
                            altitude: newLocation.coords.altitude,
                            accuracy: newLocation.coords.accuracy,
                            heading: newLocation.coords.heading,
                            speed: newLocation.coords.speed,
                        };

                        console.log('📍 Ubicación actualizada:', newCoords);
                        setLocation(newCoords);
                        setError(null);
                    }
                );

            } catch (err) {
                console.error('❌ Error en geolocalización:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        startWatching();

        // Cleanup: detener el seguimiento cuando el componente se desmonte
        return () => {
            if (subscription) {
                console.log('🛑 Deteniendo seguimiento de ubicación');
                subscription.remove();
            }
        };
    }, [enableHighAccuracy, distanceFilter, timeInterval]);

    return { location, error, loading };
};

export default useLocation;
