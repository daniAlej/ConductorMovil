import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getJornadas, createUso, getRuta, getActiveConductorLocations, getUsos } from '../api/client';
import { useProximityTracking } from '../hooks/useProximityTracking';

// IMPORTANTE: Importamos el componente (el sistema elegirá .native o .web solo)
import LocationMap from '../components/LocationMap';

const UsuarioHome = ({ session, onLogout }) => {
  const [usuario, setUsuario] = useState(null);
  const [jornadaActiva, setJornadaActiva] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usoRegistrado, setUsoRegistrado] = useState(false);
  const [yaRegistroUso, setYaRegistroUso] = useState(false);
  const [usoConfirmado, setUsoConfirmado] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // State for map
  const [driver, setDriver] = useState(null);
  const [route, setRoute] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);

  const loadUsuarioData = useCallback(async () => {
    try {
      let user;
      const storedUsuario = await AsyncStorage.getItem('@usuario');
      if (storedUsuario) {
        user = JSON.parse(storedUsuario);
        setUsuario(user);
      } else if (session?.usuario) {
        user = session.usuario;
        setUsuario(user);
      } else {
        const token = session?.token || await AsyncStorage.getItem('@token');
        if (token) {
          const { data } = await api.get('/auth/usuario/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          user = data.usuario;
          setUsuario(user);
          await AsyncStorage.setItem('@usuario', JSON.stringify(user));
        }
      }

      if (user?.id_ruta) {
        const { data: jornadas } = await getJornadas();

        // LOG TEMPORAL para debugging
        console.log('=== DEBUG JORNADAS ===');
        console.log('Total jornadas:', jornadas.length);
        console.log('ID de ruta del usuario:', user.id_ruta);
        jornadas.forEach((j, idx) => {
          console.log(`Jornada ${idx} - COMPLETO:`, j);
        });

        // Validar que la jornada sea de hoy
        const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const jornadaDeRuta = jornadas.find(j => {
          // Verificar que sea de la misma ruta
          if (j.Unidad?.id_ruta !== user.id_ruta) return false;

          // Validar que el campo fecha exista y sea válida
          if (!j.fecha) return false;

          try {
            // Comparar fecha de inicio de jornada con hoy
            const fechaJornada = new Date(j.fecha).toISOString().split('T')[0];
            console.log('Comparando:', { fechaJornada, hoy, esHoy: fechaJornada === hoy });
            return fechaJornada === hoy;
          } catch (error) {
            console.error('Error al parsear fecha de jornada:', error);
            return false;
          }
        });

        console.log('Jornada activa encontrada:', jornadaDeRuta);
        setJornadaActiva(jornadaDeRuta || null);

        // Verificar si el usuario ya tiene un uso registrado en esta jornada
        if (jornadaDeRuta) {
          try {
            const { data: usos } = await getUsos();
            const usoExistente = usos.find(uso =>
              uso.id_usuario === user.id_usuario &&
              uso.id_jornada === jornadaDeRuta.id_jornada
            );

            const tieneUso = !!usoExistente;
            const estaConfirmado = usoExistente?.confirmado === 1 || usoExistente?.confirmado === true;

            console.log('📊 Estado del uso:', {
              tieneUso,
              estaConfirmado,
              usoExistente: usoExistente || 'No existe'
            });

            setYaRegistroUso(tieneUso);
            setUsoRegistrado(tieneUso);
            setUsoConfirmado(estaConfirmado);
          } catch (error) {
            console.error('Error al verificar usos:', error);
          }
        } else {
          // Si no hay jornada, reiniciamos estados
          setUsoRegistrado(false);
          setYaRegistroUso(false);
          setUsoConfirmado(false);
          setDriver(null);
          setRoute(null);
        }
      }
    } catch (error) {
      console.error('Error al cargar los datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos.');
      onLogout();
    }
  }, [session, onLogout]);

  useEffect(() => {
    loadUsuarioData();
  }, [loadUsuarioData]);

  // Effect to fetch driver and route when usage is confirmed
  useEffect(() => {
    if (!usoRegistrado || !usuario?.id_ruta || usoConfirmado) return;

    let isMounted = true;
    let intervalId;

    const fetchDriverAndRoute = async () => {
      try {
        setMapLoading(true);
        // --- AGREGA ESTOS LOGS ---
        console.log("--- INICIO DE BÚSQUEDA ---");
        console.log("1. Mi ID de Ruta es:", usuario.id_ruta);

        const response = await getActiveConductorLocations();
        console.log("2. Respuesta del Servidor (Status):", response.status);
        console.log("3. Datos recibidos (Conductores):", JSON.stringify(response.data, null, 2));

        const activeDrivers = response.data;
        const currentDriver = activeDrivers.find(d => d.Unidad?.id_ruta === usuario.id_ruta);

        console.log("4. Conductor encontrado para mi ruta:", currentDriver);
        // -------------------------
        if (isMounted) {
          setDriver(currentDriver || null);
        }

        // 2. Obtener Ruta
        // Solo la pedimos si no la tenemos ya guardada para ahorrar datos
        if (!route) {
          const { data: routeData } = await getRuta(usuario.id_ruta);
          console.log('=== ESTRUCTURA DE ROUTE ===');
          console.log('Route completo:', JSON.stringify(routeData, null, 2));
          if (isMounted) setRoute(routeData);
        }

      } catch (error) {
        console.error("Error fetching driver or route:", error);
      } finally {
        if (isMounted) setMapLoading(false);
      }
    };

    fetchDriverAndRoute();

    // Intervalo de actualización (cada 10s)
    intervalId = setInterval(async () => {
      try {
        const { data: activeDrivers } = await getActiveConductorLocations();
        const updatedDriver = activeDrivers.find(d => d.Unidad?.id_ruta === usuario.id_ruta);
        if (isMounted) {
          setDriver(updatedDriver || null);
        }
      } catch (error) {
        console.error("Error refreshing driver location:", error);
      }
    }, 10000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [usoRegistrado, usuario, route, usoConfirmado]); // Agregamos route a dependencias para no pedirlo siempre


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsuarioData();
    setRefreshing(false);
  }, [loadUsuarioData]);

  const handleCrearUso = async () => {
    if (!jornadaActiva) {
      Alert.alert('Error', 'No hay una jornada activa para registrar el uso.');
      return;
    }
    setLoading(true);
    try {
      await createUso({
        id_usuario: usuario.id_usuario,
        id_jornada: jornadaActiva.id_jornada,
      });
      Alert.alert('Éxito', 'Se ha registrado tu intención de uso.');
      setUsoRegistrado(true);
    } catch (error) {
      console.error('Error al crear el uso:', error.response?.data || error.message);
      Alert.alert('Error', 'No se pudo registrar el uso. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ---- PREPARACIÓN DE COORDENADAS DEL USUARIO ----
  const userStopCoordinates = usuario?.latitud && usuario?.longitud
    ? {
      latitude: parseFloat(usuario.latitud),
      longitude: parseFloat(usuario.longitud)
    }
    : null;

  // ---- SISTEMA DE PROXIMIDAD ----
  // IMPORTANTE: Este hook debe estar ANTES de cualquier return condicional
  const {
    distancia,
    confirmado,
    mensaje,
    dentroDelRango,
    isChecking,
    userLocation
  } = useProximityTracking(
    usuario?.id_usuario,
    jornadaActiva?.id_jornada,
    usoRegistrado && !usoConfirmado // Solo activar si ya registró uso y aún NO está confirmado
  );

  // LOG DE DEBUG PARA PROXIMIDAD
  console.log('🔍 Estado de proximidad:', {
    usuario: usuario?.nombre,
    jornadaActiva: !!jornadaActiva,
    usoRegistrado,
    usoConfirmado,
    enabled: usoRegistrado && !usoConfirmado,
    distancia,
    confirmado,
    userLocation
  });

  // Actualizar estado cuando el hook confirme el uso
  useEffect(() => {
    if (confirmado && !usoConfirmado) {
      console.log('✅ Actualizando estado: uso confirmado por proximidad');
      setUsoConfirmado(true);
    }
  }, [confirmado, usoConfirmado]);

  // ---- VALIDACIONES Y RETORNOS CONDICIONALES ----
  if (!usuario) {
    return (
      <View style={styles.container}><Text>Cargando...</Text></View>
    );
  }

  // ---- VISTA DE MAPA (Si ya registró uso) ----
  if (usoRegistrado) {
    if (mapLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={{ marginTop: 10 }}>Localizando unidad...</Text>
        </View>
      );
    }

    // VISTA CON MAPA Y ESTADO DE PROXIMIDAD
    return (
      <View style={styles.fullContainer}>
        {/* Mapa */}
        <View style={styles.mapContainer}>
          <LocationMap
            driver={driver}
            route={route}
            userStop={userStopCoordinates}
          />
        </View>

        {/* Panel de información de proximidad */}
        <View style={styles.proximityPanel}>
          {confirmado ? (
            // Estado: Confirmado
            <View style={styles.confirmedContainer}>
              <Text style={styles.confirmedIcon}>✅</Text>
              <Text style={styles.confirmedTitle}>¡Viaje Confirmado!</Text>
              <Text style={styles.confirmedSubtitle}>
                Tu presencia ha sido registrada automáticamente
              </Text>
            </View>
          ) : (
            // Estado: Verificando proximidad
            <View style={styles.trackingContainer}>
              <View style={styles.distanceRow}>
                <Text style={styles.distanceLabel}>Distancia a la unidad:</Text>
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceValue}>
                    {distancia ? `${distancia}m` : '---'}
                  </Text>
                </View>
              </View>

              {mensaje && (
                <Text style={styles.statusMessage}>{mensaje}</Text>
              )}

              {dentroDelRango && (
                <View style={styles.alertContainer}>
                  <Text style={styles.alertIcon}>🔔</Text>
                  <Text style={styles.alertText}>
                    La unidad está cerca. Tu viaje se confirmará automáticamente.
                  </Text>
                </View>
              )}

              {isChecking && (
                <View style={styles.checkingIndicator}>
                  <ActivityIndicator size="small" color="#667eea" />
                  <Text style={styles.checkingText}>Verificando...</Text>
                </View>
              )}

              {userLocation && (
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>📍 Tu ubicación GPS activa</Text>
                  <Text style={styles.locationCoords}>
                    {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Bienvenido, {usuario.nombre}</Text>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Ruta Asignada:</Text>
        <Text style={styles.info}>{usuario?.nombre_ruta || '(sin ruta)'}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Parada:</Text>
        <Text style={styles.info}>{usuario?.nombre_parada || '(sin parada)'}</Text>
      </View>

      {jornadaActiva ? (
        <View style={styles.jornadaContainer}>
          <Text style={styles.jornadaText}>¡El conductor de tu unidad ha iniciado el recorrido!</Text>
          <Button
            title={yaRegistroUso ? 'Uso ya registrado' : (loading ? 'Registrando...' : 'Solicitar Uso')}
            onPress={handleCrearUso}
            disabled={loading || yaRegistroUso}
            color={yaRegistroUso ? '#999' : '#007bff'}
          />
          {yaRegistroUso && (
            <Text style={styles.warningText}>Ya has solicitado el uso para esta jornada</Text>
          )}
        </View>
      ) : (
        <Text style={styles.jornadaText}>El conductor aún no ha iniciado la jornada de hoy.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  infoContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    width: 120,
  },
  info: {
    fontSize: 18,
    flex: 1,
  },
  jornadaContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#e0f7fa',
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  jornadaText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#00796b',
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    color: '#f57c00',
    fontStyle: 'italic',
  },
  // Nuevos estilos para el sistema de proximidad
  fullContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    flex: 1,
  },
  proximityPanel: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  confirmedContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#d4edda',
    borderRadius: 15,
  },
  confirmedIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  confirmedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 5,
  },
  confirmedSubtitle: {
    fontSize: 14,
    color: '#155724',
    textAlign: 'center',
  },
  trackingContainer: {
    gap: 15,
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  distanceLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  distanceBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  distanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 5,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  alertIcon: {
    fontSize: 24,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
  },
  checkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  checkingText: {
    fontSize: 14,
    color: '#667eea',
  },
  locationInfo: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  locationCoords: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
});

export default UsuarioHome;