// src/hooks/useProximityTracking.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { verificarProximidadUsuario } from '../api/client';
import * as Location from 'expo-location'; // IMPORTANTE: Usamos la librería directa
import { Alert } from 'react-native';

export const useProximityTracking = (idUsuario, idJornada, enabled = true) => {
    // Estado local para la ubicación (reemplazamos useLocation)
    const [userLocation, setUserLocation] = useState(null);

    // Referencia para la suscripción del GPS
    const locationSubscription = useRef(null);

    const [proximityData, setProximityData] = useState({
        distancia: null,
        confirmado: false,
        mensaje: '',
        dentroDelRango: false,
    });

    const [isChecking, setIsChecking] = useState(false);
    const [lastNotification, setLastNotification] = useState(null);

    // 1. EFECTO DE CONTROL DEL GPS (Encender/Apagar)
    useEffect(() => {
        // Función para limpiar suscripción
        const stopLocationUpdates = () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
                console.log('🛑 [GPS] Suscripción de ubicación detenida.');
            }
        };

        const startLocationUpdates = async () => {
            // Si no está habilitado o ya se confirmó, NO encendemos el GPS
            if (!enabled || proximityData.confirmado) {
                stopLocationUpdates();
                return;
            }

            try {
                // Pedir permisos si es necesario
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.error('❌ Permiso de ubicación denegado');
                    return;
                }

                console.log('🚀 [GPS] Iniciando rastreo de ubicación...');

                // Iniciar suscripción
                locationSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 5000,
                        distanceInterval: 10,
                    },
                    (location) => {
                        // Actualizamos el estado local
                        setUserLocation(location.coords);
                    }
                );
            } catch (error) {
                console.error('❌ Error al iniciar GPS:', error);
            }
        };

        // Ejecutar lógica de inicio/parada
        startLocationUpdates();

        // Cleanup al desmontar
        return () => stopLocationUpdates();

    }, [enabled, proximityData.confirmado]); // SE EJECUTA SI CAMBIA "ENABLED" O "CONFIRMADO"


    // 2. LÓGICA DE VERIFICACIÓN CON BACKEND (Se mantiene similar)
    const verificarProximidad = useCallback(async () => {
        // Usamos userLocation del estado local
        if (!enabled || !userLocation || !idUsuario || !idJornada || proximityData.confirmado) {
            return;
        }

        setIsChecking(true);

        try {
            const data = await verificarProximidadUsuario(idUsuario, {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                id_jornada: idJornada,
            });

            // Si la jornada finalizó
            if (data.jornadaFinalizada || data.jornadaNoActiva) {
                setProximityData(prev => ({
                    ...prev,
                    confirmado: true, // Esto disparará el useEffect de arriba para apagar el GPS
                    mensaje: 'La jornada ha finalizado'
                }));
                Alert.alert('🏁 Jornada Finalizada', 'El seguimiento se ha detenido.');
                return;
            }

            // Actualizar datos
            setProximityData(prev => ({
                ...prev,
                distancia: data.distancia,
                confirmado: data.confirmado,
                mensaje: data.mensaje,
                dentroDelRango: data.dentroDelRango,
            }));

            // Lógica de notificaciones
            if (data.confirmado && !proximityData.confirmado) {
                Alert.alert('✅ ¡Uso Confirmado!', 'Te has subido a la unidad. Dejaremos de compartir tu ubicación.');
                // ALERTA: Al ponerse confirmado en true, el useEffect del GPS se disparará y APAGARÁ el rastreo.
            }
            else if (data.dentroDelRango && !data.confirmado && lastNotification !== 'approaching') {
                Alert.alert('🔔 Cerca', `Estás a ${data.distancia}m.`);
                setLastNotification('approaching');
            }

        } catch (error) {
            console.error('❌ Error verificando proximidad:', error);
        } finally {
            setIsChecking(false);
        }
    }, [userLocation, idUsuario, idJornada, enabled, proximityData.confirmado, lastNotification]);


    // 3. INTERVALO DE VERIFICACIÓN
    useEffect(() => {
        // Si no está habilitado o ya confirmó, no hacemos nada
        if (!enabled || proximityData.confirmado) return;

        // Verificación inmediata si hay ubicación
        if (userLocation) verificarProximidad();

        const interval = setInterval(() => {
            if (userLocation) {
                console.log('🔄 Intervalo: Verificando API...');
                verificarProximidad();
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [enabled, proximityData.confirmado, userLocation, verificarProximidad]);

    return {
        ...proximityData,
        isChecking,
        verificarProximidad,
        userLocation: userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null,
    };
};

export default useProximityTracking;