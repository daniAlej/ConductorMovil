// src/hooks/useLocation.web.js
import { useState, useEffect } from 'react';

/**
 * Hook personalizado para obtener y rastrear la ubicación del usuario EN LA WEB
 * Usa la API del navegador en lugar de expo-location
 */
export const useLocation = (options = {}) => {
    const {
        enableHighAccuracy = true,
        distanceFilter = 10,
        timeInterval = 5000,
    } = options;

    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let watchId;
        let timeoutId;

        const startWatching = async () => {
            try {
                // Verificar si el navegador soporta geolocalización
                if (!navigator.geolocation) {
                    setError('Tu navegador no soporta geolocalización');
                    setLoading(false);
                    console.error('❌ Navegador no soporta geolocalización');
                    return;
                }

                console.log('📍 [WEB] Solicitando ubicación...');

                // 1. Obtener ubicación inicial
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const coords = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            altitude: position.coords.altitude,
                            accuracy: position.coords.accuracy,
                            heading: position.coords.heading,
                            speed: position.coords.speed,
                        };

                        console.log('📍 [WEB] Ubicación inicial obtenida:', coords);
                        setLocation(coords);
                        setLoading(false);
                    },
                    (err) => {
                        console.error('❌ [WEB] Error al obtener ubicación inicial:', err);
                        setError(err.message);
                        setLoading(false);
                    },
                    {
                        enableHighAccuracy,
                        timeout: 10000,
                        maximumAge: 0,
                    }
                );

                // 2. Observar cambios de ubicación
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const newCoords = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            altitude: position.coords.altitude,
                            accuracy: position.coords.accuracy,
                            heading: position.coords.heading,
                            speed: position.coords.speed,
                        };

                        console.log('📍 [WEB] Ubicación actualizada:', newCoords);
                        setLocation(newCoords);
                        setError(null);
                    },
                    (err) => {
                        console.error('❌ [WEB] Error en geolocalización:', err);
                        setError(err.message);
                    },
                    {
                        enableHighAccuracy,
                        timeout: 10000,
                        maximumAge: 0,
                    }
                );

                console.log('✅ [WEB] Seguimiento de ubicación iniciado (watchId:', watchId, ')');

            } catch (err) {
                console.error('❌ [WEB] Error en geolocalización:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        startWatching();

        // Cleanup: detener el seguimiento cuando el componente se desmonte
        return () => {
            if (watchId !== undefined) {
                console.log('🛑 [WEB] Deteniendo seguimiento de ubicación (watchId:', watchId, ')');
                navigator.geolocation.clearWatch(watchId);
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [enableHighAccuracy, distanceFilter, timeInterval]);

    return { location, error, loading };
};

export default useLocation;
