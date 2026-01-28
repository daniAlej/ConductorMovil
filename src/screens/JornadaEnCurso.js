// src/screens/JornadaEnCurso.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import * as Location from 'expo-location';
import {
    getJornadaActiva,
    getParadasPendientes,
    confirmarParada,
    finalizarJornada,
    verificarProximidad
} from '../api/client';
import api from '../api/client';
import PUNTO_FINAL_CONFIG from '../config/puntoFinal';

const JornadaEnCurso = ({ session, onJornadaFinalizada }) => {
    const [jornada, setJornada] = useState(null);
    const [paradasPendientes, setParadasPendientes] = useState([]);
    const [paradaCercana, setParadaCercana] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmando, setConfirmando] = useState(false);
    const [ubicacionActual, setUbicacionActual] = useState(null);

    const locationSubscription = useRef(null);
    const proximityCheckInterval = useRef(null);

    // Cargar jornada activa
    useEffect(() => {
        loadJornadaActiva();
    }, []);

    // Iniciar tracking de ubicación
    useEffect(() => {
        startLocationTracking();
        return () => {
            stopLocationTracking();
        };
    }, []);

    // Verificar proximidad cada 10 segundos
    useEffect(() => {
        if (ubicacionActual && jornada) {
            proximityCheckInterval.current = setInterval(() => {
                checkProximity(); // Verificar paradas cercanas
                checkProximidadPuntoFinal(); // Verificar punto final
            }, PUNTO_FINAL_CONFIG.intervaloVerificacion);
        }

        return () => {
            if (proximityCheckInterval.current) {
                clearInterval(proximityCheckInterval.current);
            }
        };
    }, [ubicacionActual, jornada]);

    const loadJornadaActiva = async () => {
        try {
            const { data } = await getJornadaActiva(session.conductor.id_conductor);
            setJornada(data);

            if (data) {
                loadParadasPendientes(data.id_jornada);
            }
        } catch (error) {
            console.error('Error al cargar jornada:', error);
            Alert.alert('Error', 'No se pudo cargar la jornada activa.');
        } finally {
            setLoading(false);
        }
    };

    const loadParadasPendientes = async (idJornada) => {
        try {
            const { data } = await getParadasPendientes(idJornada);
            setParadasPendientes(data);
        } catch (error) {
            console.error('Error al cargar paradas pendientes:', error);
        }
    };

    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Se necesita permiso de ubicación.');
                return;
            }

            console.log('📍 Iniciando tracking de ubicación del conductor...');
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // cada 5 segundos
                    distanceInterval: 10, // cada 10 metros
                },
                async (location) => {
                    const { latitude, longitude } = location.coords;
                    setUbicacionActual({ latitude, longitude });

                    // Enviar ubicación al backend
                    try {
                        await api.post('/conductores/location', {
                            latitud: latitude,
                            longitud: longitude,
                        });
                    } catch (error) {
                        console.error('Error al enviar ubicación:', error);
                    }
                }
            );
        } catch (error) {
            console.error('Error al iniciar tracking:', error);
        }
    };

    const stopLocationTracking = () => {
        console.log('🛑 Deteniendo tracking de ubicación del conductor...');

        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
            console.log('✅ Location subscription removida');
        }

        if (proximityCheckInterval.current) {
            clearInterval(proximityCheckInterval.current);
            proximityCheckInterval.current = null;
            console.log('✅ Proximity interval detenido');
        }
    };

    // Función para calcular distancia entre dos coordenadas (Haversine)
    const calcularDistancia = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Radio de la Tierra en metros
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distancia en metros
    };

    // Verificar proximidad al punto final
    const checkProximidadPuntoFinal = () => {
        if (!ubicacionActual) return;

        const distancia = calcularDistancia(
            ubicacionActual.latitude,
            ubicacionActual.longitude,
            PUNTO_FINAL_CONFIG.latitud,
            PUNTO_FINAL_CONFIG.longitud
        );

        console.log(`📏 Distancia al punto final (${PUNTO_FINAL_CONFIG.nombre}): ${distancia.toFixed(2)}m`);

        // Si está dentro del radio de proximidad (20 metros)
        if (distancia <= PUNTO_FINAL_CONFIG.distanciaProximidad) {
            console.log(`🎯 ¡Llegaste al punto final! (${distancia.toFixed(2)}m)`);
            console.log('🏁 Iniciando finalización automática de jornada...');

            // Finalizar automáticamente
            handleFinalizarJornadaAutomatica();
        }
    };

    const checkProximity = async () => {
        if (!ubicacionActual) return;

        try {
            const { data } = await verificarProximidad({
                latitud: ubicacionActual.latitude,
                longitud: ubicacionActual.longitude,
            });

            if (data.dentroDelRadio && data.parada) {
                setParadaCercana(data.parada);

                // Mostrar alerta solo una vez por parada
                if (!paradaCercana || paradaCercana.id_parada !== data.parada.id_parada) {
                    Alert.alert(
                        '📍 Parada Cercana',
                        `Estás a ${data.distancia}m de "${data.parada.nombre_parada}". ¿Deseas confirmar llegada?`,
                        [
                            { text: 'Ahora no', style: 'cancel' },
                            { text: 'Confirmar', onPress: () => handleConfirmarParada(data.parada) }
                        ]
                    );
                }
            } else {
                setParadaCercana(null);
            }
        } catch (error) {
            console.error('Error al verificar proximidad:', error);
        }
    };

    const handleConfirmarParada = async (parada) => {
        if (!ubicacionActual) {
            Alert.alert('Error', 'No se pudo obtener tu ubicación actual.');
            return;
        }

        setConfirmando(true);
        try {
            const { data } = await confirmarParada({
                id_parada: parada.id_parada,
                latitud: ubicacionActual.latitude,
                longitud: ubicacionActual.longitude,
            });

            Alert.alert('✅ Parada Confirmada', data.mensaje);

            // Recargar paradas pendientes
            await loadParadasPendientes(jornada.id_jornada);

            // Si es la última parada, finalizar automáticamente la jornada
            if (data.esUltimaParada) {
                console.log('🏁 Última parada confirmada - Finalizando jornada automáticamente...');

                Alert.alert(
                    '🎉 Última Parada Completada',
                    'Has completado todas las paradas. La jornada se finalizará y se detendrá el seguimiento de ubicación.',
                    [
                        {
                            text: 'Entendido',
                            onPress: async () => {
                                await handleFinalizarJornada();
                            }
                        }
                    ],
                    { cancelable: false } // No permitir cerrar sin finalizar
                );
            }

        } catch (error) {
            const mensaje = error.response?.data?.error || 'No se pudo confirmar la parada.';
            Alert.alert('Error', mensaje);
        } finally {
            setConfirmando(false);
        }
    };

    // Finalizar jornada automáticamente (sin confirmación) al llegar al punto final
    const handleFinalizarJornadaAutomatica = async () => {
        if (!ubicacionActual) {
            console.error('❌ No hay ubicación actual para finalizar jornada');
            return;
        }

        console.log('🏁 Finalizando jornada AUTOMÁTICAMENTE (punto final alcanzado)...');

        try {
            await finalizarJornada({
                latitud: ubicacionActual.latitude,
                longitud: ubicacionActual.longitude,
            });

            console.log('✅ Jornada finalizada automáticamente en el backend');

            // Detener todos los tracking INMEDIATAMENTE
            stopLocationTracking();

            Alert.alert(
                '🎯 Llegaste al Destino Final',
                `Has llegado al punto final (${PUNTO_FINAL_CONFIG.nombre}).\n\nLa jornada se ha finalizado automáticamente y el seguimiento de ubicación ha sido detenido.`,
                [{ text: 'OK', onPress: () => onJornadaFinalizada() }]
            );

        } catch (error) {
            const mensaje = error.response?.data?.error || 'No se pudo finalizar la jornada automáticamente.';
            console.error('❌ Error al finalizar jornada automáticamente:', error);
            Alert.alert('Error', mensaje);
        }
    };

    const handleFinalizarJornada = async () => {
        if (!ubicacionActual) {
            Alert.alert('Error', 'No se pudo obtener tu ubicación actual.');
            return;
        }

        console.log('🏁 Finalizando jornada...');

        try {
            await finalizarJornada({
                latitud: ubicacionActual.latitude,
                longitud: ubicacionActual.longitude,
            });

            console.log('✅ Jornada finalizada en el backend');

            // Detener todos los tracking
            stopLocationTracking();

            Alert.alert(
                '✅ Jornada Finalizada',
                'La jornada se ha finalizado correctamente. El seguimiento de ubicación ha sido detenido.',
                [{ text: 'OK', onPress: () => onJornadaFinalizada() }]
            );

        } catch (error) {
            const mensaje = error.response?.data?.error || 'No se pudo finalizar la jornada.';
            Alert.alert('Error', mensaje);
            console.error('Error al finalizar jornada:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={{ marginTop: 10 }}>Cargando jornada...</Text>
            </View>
        );
    }

    if (!jornada) {
        return (
            <View style={styles.centered}>
                <Text style={styles.title}>No hay jornada activa</Text>
                <Text style={styles.subtitle}>Inicia una jornada para comenzar.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Jornada en Curso</Text>
                <Text style={styles.subtitle}>Ruta: {jornada.Ruta?.nombre_ruta || 'N/A'}</Text>
                <Text style={styles.info}>
                    Paradas completadas: {jornada.paradas_completadas}/{jornada.paradas_totales}
                </Text>
            </View>

            {ubicacionActual && (
                <View style={styles.locationCard}>
                    <Text style={styles.locationTitle}>📍 Tu Ubicación</Text>
                    <Text style={styles.locationText}>
                        Lat: {ubicacionActual.latitude.toFixed(6)}, Lng: {ubicacionActual.longitude.toFixed(6)}
                    </Text>
                </View>
            )}

            {paradaCercana && (
                <View style={styles.alertCard}>
                    <Text style={styles.alertTitle}>🔔 Parada Cercana</Text>
                    <Text style={styles.alertText}>{paradaCercana.nombre_parada}</Text>
                    <Button
                        title={confirmando ? 'Confirmando...' : 'Confirmar Llegada'}
                        onPress={() => handleConfirmarParada(paradaCercana)}
                        disabled={confirmando}
                    />
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Paradas Pendientes ({paradasPendientes.length})</Text>
                {paradasPendientes.map((visita, index) => (
                    <View key={visita.id_parada_visita} style={styles.paradaCard}>
                        <Text style={styles.paradaOrden}>#{visita.orden_visita}</Text>
                        <Text style={styles.paradaNombre}>{visita.Parada.nombre_parada}</Text>
                        <Text style={styles.paradaEstado}>Estado: {visita.estado}</Text>
                    </View>
                ))}
                {paradasPendientes.length === 0 && (
                    <Text style={styles.emptyText}>No hay paradas pendientes</Text>
                )}
            </View>

            <View style={styles.buttonContainer}>
                <Button
                    title="Finalizar Jornada"
                    onPress={() => {
                        Alert.alert(
                            'Confirmar',
                            '¿Estás seguro de que deseas finalizar la jornada?',
                            [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Finalizar', onPress: handleFinalizarJornada }
                            ]
                        );
                    }}
                    color="#d32f2f"
                />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        backgroundColor: '#007bff',
        padding: 20,
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#e3f2fd',
        marginBottom: 5,
    },
    info: {
        fontSize: 14,
        color: '#fff',
    },
    locationCard: {
        backgroundColor: '#e8f5e9',
        padding: 15,
        margin: 10,
        borderRadius: 8,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginBottom: 5,
    },
    locationText: {
        fontSize: 12,
        color: '#1b5e20',
    },
    alertCard: {
        backgroundColor: '#fff3e0',
        padding: 15,
        margin: 10,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
    },
    alertTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#e65100',
        marginBottom: 5,
    },
    alertText: {
        fontSize: 16,
        color: '#f57c00',
        marginBottom: 10,
    },
    section: {
        backgroundColor: '#fff',
        padding: 15,
        margin: 10,
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    paradaCard: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        marginBottom: 8,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#ffa726',
    },
    paradaOrden: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    paradaNombre: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    paradaEstado: {
        fontSize: 12,
        color: '#999',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
        padding: 20,
    },
    buttonContainer: {
        margin: 10,
        marginBottom: 30,
    },
});

export default JornadaEnCurso;
