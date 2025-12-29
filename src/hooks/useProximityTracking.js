// src/hooks/useProximityTracking.js
import { useState, useEffect, useCallback } from 'react';
import { verificarProximidadUsuario } from '../api/client';
import { useLocation } from './useLocation';
import { Alert } from 'react-native';

/**
 * Hook personalizado para rastrear la proximidad entre el usuario y la unidad (bus)
 * Verifica automáticamente cada 10 segundos y confirma el uso cuando está cerca
 * 
 * @param {number} idUsuario - ID del usuario
 * @param {number} idJornada - ID de la jornada activa
 * @param {boolean} enabled - Si el tracking está habilitado
 * @returns {Object} { distancia, confirmado, mensaje, dentroDelRango, isChecking, verificarProximidad }
 */
export const useProximityTracking = (idUsuario, idJornada, enabled = true) => {
    const { location } = useLocation({
        enableHighAccuracy: true,
        distanceFilter: 10,
        timeInterval: 5000
    });

    const [proximityData, setProximityData] = useState({
        distancia: null,
        confirmado: false,
        mensaje: '',
        dentroDelRango: false,
    });

    const [isChecking, setIsChecking] = useState(false);
    const [lastNotification, setLastNotification] = useState(null);

    // DEBUG: Log hook params and location
    console.log('🎯 useProximityTracking Estado:', {
        idUsuario,
        idJornada,
        enabled,
        hasLocation: !!location,
        location: location ? { lat: location.latitude, lng: location.longitude } : null,
        proximityData
    });

    const verificarProximidad = useCallback(async () => {
        if (!enabled || !location || !idUsuario || !idJornada) {
            console.log('⏸️ Proximidad no habilitada o faltan datos:', {
                enabled,
                hasLocation: !!location,
                idUsuario,
                idJornada
            });
            return;
        }

        setIsChecking(true);

        try {
            console.log('🔍 Verificando proximidad...', {
                idUsuario,
                idJornada,
                location: { lat: location.latitude, lng: location.longitude }
            });

            const data = await verificarProximidadUsuario(idUsuario, {
                latitude: location.latitude,
                longitude: location.longitude,
                id_jornada: idJornada,
            });

            console.log('📊 Respuesta de proximidad:', data);

            const previousConfirmado = proximityData.confirmado;

            setProximityData({
                distancia: data.distancia,
                confirmado: data.confirmado,
                mensaje: data.mensaje,
                dentroDelRango: data.dentroDelRango,
            });

            // Si se confirmó por primera vez, mostrar notificación
            if (data.confirmado && !previousConfirmado) {
                console.log('✅ ¡Uso confirmado automáticamente!');
                Alert.alert(
                    '✅ ¡Uso Confirmado!',
                    'Tu viaje ha sido confirmado automáticamente porque estás cerca de la unidad.',
                    [{ text: 'Entendido', style: 'default' }]
                );
                setLastNotification('confirmed');
            }
            // Si está dentro del rango pero aún no confirmado, notificar
            else if (data.dentroDelRango && !data.confirmado && lastNotification !== 'approaching') {
                console.log('🔔 La unidad está cerca');
                Alert.alert(
                    '🔔 La Unidad Está Cerca',
                    `La unidad está a ${data.distancia}m de tu ubicación. Tu viaje se confirmará automáticamente cuando estés más cerca.`,
                    [{ text: 'OK', style: 'default' }]
                );
                setLastNotification('approaching');
            }

        } catch (error) {
            console.error('❌ Error verificando proximidad:', error);
            console.error('❌ Error detalles:', error.response?.data || error.message);
            setProximityData(prev => ({
                ...prev,
                mensaje: 'Error al verificar proximidad'
            }));
        } finally {
            setIsChecking(false);
        }
    }, [location, idUsuario, idJornada, enabled, proximityData.confirmado, lastNotification]);

    // Verificar proximidad automáticamente cada 10 segundos
    useEffect(() => {
        if (!enabled || proximityData.confirmado) {
            console.log('⏹️ Tracking detenido -', proximityData.confirmado ? 'Ya confirmado' : 'No habilitado');
            return;
        }

        console.log('▶️ Iniciando tracking de proximidad automático');

        // Verificación inicial
        verificarProximidad();

        // Verificación periódica cada 10 segundos
        const interval = setInterval(() => {
            console.log('🔄 Intervalo: Verificando proximidad...');
            verificarProximidad();
        }, 10000);

        return () => {
            console.log('🧹 Limpiando intervalo de proximidad');
            clearInterval(interval);
        };
    }, [enabled, proximityData.confirmado, verificarProximidad]);

    return {
        ...proximityData,
        isChecking,
        verificarProximidad,
        userLocation: location,
    };
};

export default useProximityTracking;
