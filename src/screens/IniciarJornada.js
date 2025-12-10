// src/screens/IniciarJornada.js
import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, FlatList, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { iniciarJornada, getUsoIntencion, getJornadaActiva } from '../api/client';
import API from '../api/client';

const IniciarJornada = forwardRef(({ session, onJornadaIniciada }, ref) => {
  const [loading, setLoading] = useState(false);
  const [verificandoJornada, setVerificandoJornada] = useState(true); // Para mostrar loading inicial
  const [jornadaIniciada, setJornadaIniciada] = useState(false);
  const [pasajeros, setPasajeros] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [ultimaUbicacion, setUltimaUbicacion] = useState(null); // Para mostrar en UI
  const locationSubscription = useRef(null);
  const intervaloPasajeros = useRef(null);

  useImperativeHandle(ref, () => ({
    stopLocationTracking: () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        console.log('🛑 Tracking de ubicación detenido');
      }
      if (intervaloPasajeros.current) {
        clearInterval(intervaloPasajeros.current);
        console.log('🛑 Intervalo de actualización detenido');
      }
    },
  }));

  // Cargar pasajeros después de iniciar jornada
  const cargarPasajeros = async () => {
    try {
      console.log('📥 Cargando pasajeros de la ruta...');
      const { data } = await getUsoIntencion();

      const rutaId = session.conductor.id_ruta;
      const unidadId = session.conductor.id_unidad;
      const hoy = new Date().toISOString().split('T')[0];

      console.log('🔍 Datos para filtrar:', {
        totalRegistros: data?.length || 0,
        rutaId,
        unidadId,
        hoy,
        conductor: session.conductor.nombre,
      });

      // Mostrar TODOS los registros de usoIntencion (solo si están vacíos)
      if (data && data.length === 0) {
        console.log('⚠️ No hay registros en usoIntencion');
      } else if (data && data.length > 0) {
        console.log(`📊 Total registros de usoIntencion: ${data.length}`);
        // Mostrar el primer registro COMPLETO para debug
        console.log('📋 Primer registro COMPLETO:', JSON.stringify(data[0], null, 2));
      }

      // Filtrar pasajeros - NUEVA LÓGICA MÁS FLEXIBLE
      let incluidos = 0;
      let excluidos = 0;

      const filtrados = (data || [])
        .filter(u => {
          // Debe tener usuario
          if (!u.Usuario) {
            excluidos++;
            console.log(`❌ Excluido (sin usuario): id_uso=${u.id_uso}`);
            return false;
          }

          // Debe tener jornada
          if (!u.Jornada) {
            excluidos++;
            console.log(`❌ Excluido (sin jornada): ${u.Usuario.nombre}`);
            return false;
          }

          const fechaUso = new Date(u.Jornada.fecha).toISOString().split('T')[0];

          // Verificar por unidad O por ruta (usar Jornada.id_ruta, no Usuario.id_ruta)
          const cumpleUnidad = u.Jornada.id_unidad === unidadId;
          const cumpleRuta = u.Jornada.id_ruta === rutaId; // CORREGIDO: Usar Jornada.id_ruta
          const cumpleFecha = fechaUso === hoy;

          if (!cumpleFecha) {
            excluidos++;
            console.log(`❌ Excluido (fecha): ${u.Usuario.nombre} - Fecha jornada: ${fechaUso} vs hoy: ${hoy}`);
            return false;
          }

          if (!cumpleUnidad && !cumpleRuta) {
            excluidos++;
            console.log(`❌ Excluido (ruta/unidad): ${u.Usuario.nombre} - Jornada.id_ruta=${u.Jornada.id_ruta} vs conductor.id_ruta=${rutaId}, Jornada.id_unidad=${u.Jornada.id_unidad} vs conductor.id_unidad=${unidadId}`);
            return false;
          }

          const cumple = (cumpleUnidad || cumpleRuta) && cumpleFecha;

          if (cumple) {
            incluidos++;
            console.log(`✅ Incluido: ${u.Usuario.nombre} (${u.Usuario.Parada?.nombre_parada})`);
          }

          return cumple;
        })
        .map(u => ({
          id_uso: u.id_uso,
          nombre: u.Usuario?.nombre || '(sin nombre)',
          parada: u.Usuario?.Parada?.nombre_parada || '(sin parada)',
          hora: u.Jornada?.hora_inicio || 'N/A',
        }));

      console.log(`📊 Resumen: ${incluidos} incluidos, ${excluidos} excluidos`);

      console.log('✅ Pasajeros encontrados:', filtrados.length);
      if (filtrados.length > 0) {
        console.log('📋 Pasajeros:', filtrados);
      }

      setPasajeros(filtrados);
    } catch (error) {
      console.error('❌ Error al cargar pasajeros:', error);
    }
  };

  // Verificar si ya existe una jornada activa para este conductor hoy
  const verificarJornadaActiva = async () => {
    try {
      console.log('🔍 ========== VERIFICANDO JORNADA ACTIVA ==========');
      const idConductor = session.conductor.id_conductor;
      console.log('📋 ID Conductor a buscar:', idConductor);
      console.log('📋 Datos completos del conductor:', {
        id_conductor: session.conductor.id_conductor,
        nombre: session.conductor.nombre,
        id_unidad: session.conductor.id_unidad,
        id_ruta: session.conductor.id_ruta,
      });

      console.log('📤 Llamando a getJornadaActiva(' + idConductor + ')...');
      const response = await getJornadaActiva(idConductor);

      console.log('� Respuesta completa del backend:');
      console.log('   response.data:', JSON.stringify(response.data, null, 2));
      console.log('   response.status:', response.status);

      // Verificar múltiples formatos de respuesta
      const jornada = response.data?.jornada || response.data;

      console.log('🔍 Jornada extraída:', JSON.stringify(jornada, null, 2));

      if (jornada && jornada.id_jornada) {
        console.log('✅ Jornada encontrada:');
        console.log('   ID Jornada:', jornada.id_jornada);
        console.log('   Estado:', jornada.estado);
        console.log('   Fecha:', jornada.fecha);
        console.log('   ID Conductor:', jornada.id_conductor);

        // **VALIDAR QUE LA FECHA SEA HOY**
        const fechaJornada = new Date(jornada.fecha).toISOString().split('T')[0];
        const hoy = new Date().toISOString().split('T')[0];

        console.log('🗓️ Validación de fecha:');
        console.log('   Fecha jornada:', fechaJornada);
        console.log('   Fecha hoy:', hoy);
        console.log('   ¿Son iguales?:', fechaJornada === hoy);

        if (fechaJornada !== hoy) {
          console.log('❌ La jornada NO es de hoy, se ignora');
          console.log(`   La jornada es del ${fechaJornada} pero hoy es ${hoy}`);
          setJornadaIniciada(false);
          return;
        }

        console.log('✅ La jornada es de hoy y está activa');

        // Marcar jornada como iniciada
        setJornadaIniciada(true);

        // Cargar pasajeros
        await cargarPasajeros();

        // Iniciar actualización automática
        iniciarActualizacionPasajeros();

        // Iniciar tracking de ubicación
        await iniciarTracking();

        console.log('✅ Estado restaurado de jornada activa');
      } else {
        console.log('❌ No hay jornada activa para hoy');
        console.log('   Razón: La respuesta no contiene jornada válida');
        console.log('   response.data:', response.data);
      }
    } catch (error) {
      console.error('❌ Error al verificar jornada activa:');
      console.error('   Error completo:', error);
      console.error('   Error message:', error.message);
      console.error('   Error response:', error.response?.data);
      console.error('   Error status:', error.response?.status);
    } finally {
      setVerificandoJornada(false);
      console.log('🏁 Verificación de jornada finalizada');
    }
  };

  // Iniciar actualización automática de pasajeros cada 10 segundos
  const iniciarActualizacionPasajeros = () => {
    // Limpiar intervalo anterior si existe
    if (intervaloPasajeros.current) {
      clearInterval(intervaloPasajeros.current);
    }

    console.log('🔄 Iniciando actualización automática de pasajeros cada 10 segundos');
    intervaloPasajeros.current = setInterval(async () => {
      try {
        console.log('🔄 Actualizando pasajeros... (automático)');
        await cargarPasajeros();
      } catch (error) {
        console.error('❌ Error en actualización automática:', error.message);
      }
    }, 10000); // 10 segundos
  };

  // Iniciar tracking de ubicación
  const iniciarTracking = async () => {
    try {
      // IMPORTANTE: Limpiar suscripción anterior si existe
      if (locationSubscription.current) {
        console.log('🧹 Limpiando suscripción de ubicación anterior...');
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      // Solicitar permisos (no solo verificar)
      console.log('📍 Solicitando permisos de ubicación...');
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('❌ Permisos de ubicación denegados');
        Alert.alert(
          'Permiso Requerido',
          'Necesitas otorgar permiso de ubicación para compartir tu ubicación en tiempo real con los pasajeros.'
        );
        return;
      }

      console.log('✅ Permisos de ubicación otorgados');
      console.log('🚀 Iniciando tracking de ubicación...');
      console.log('⚙️ Configuración GPS: timeInterval=3000ms (3s), distanceInterval=0m, accuracy=Balanced');
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // CAMBIADO: Balanced en lugar de High para evitar throttling
          timeInterval: 3000, // CAMBIADO: 3 segundos en lugar de 5 para compensar posible throttling
          distanceInterval: 0, // 0 metros = actualizar por tiempo, no por distancia
        },
        async (location) => {
          const { latitude, longitude } = location.coords;

          // Actualizar estado para mostrar en UI
          setUltimaUbicacion({
            latitud: latitude,
            longitud: longitude,
            timestamp: new Date().toLocaleTimeString()
          });

          try {
            const response = await API.post('/conductores/location', {
              latitud: latitude,
              longitud: longitude,
            });
            // Log simplificado - solo si hay error se muestra detallado
            console.log(`✅ Ubicación enviada: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            console.log('📥 Respuesta servidor:', JSON.stringify(response.data));
          } catch (error) {
            console.error('❌ Error ubicación:', error.response?.status, error.response?.data?.error || error.message);
          }
        }
      );
      console.log('✅ Tracking de ubicación iniciado');
    } catch (error) {
      console.error('❌ Error al iniciar tracking:', error.message);
    }
  };

  // useEffect para verificar jornada activa al cargar
  useEffect(() => {
    verificarJornadaActiva();

    // Cleanup al desmontar
    return () => {
      console.log('🧹 Cleanup: Desmontando componente...');
      if (intervaloPasajeros.current) {
        clearInterval(intervaloPasajeros.current);
        console.log('🧹 Intervalo de pasajeros limpiado');
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        console.log('🧹 Suscripción de ubicación limpiada');
      }
    };
  }, []);

  const handleIniciarJornada = async () => {
    console.log('🔘 ========== INICIANDO JORNADA ==========');
    console.log('📋 Datos del conductor:', {
      nombre: session.conductor.nombre,
      id_conductor: session.conductor.id_conductor,
      id_unidad: session.conductor.id_unidad,
      id_ruta: session.conductor.id_ruta,
      placa: session.conductor.placa,
      nombre_ruta: session.conductor.nombre_ruta,
    });

    // Validar que el conductor tenga unidad y ruta asignadas
    if (!session.conductor.id_unidad || !session.conductor.id_ruta) {
      console.error('❌ Faltan datos del conductor');
      Alert.alert(
        'Error',
        `No tienes una ${!session.conductor.id_unidad ? 'unidad' : 'ruta'} asignada. Contacta con el administrador.`
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Pedir permisos de ubicación PRIMERO
      console.log('📍 Paso 1: Solicitando permisos de ubicación...');
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.error('❌ Permisos de ubicación denegados');
        Alert.alert(
          'Permiso Requerido',
          'Necesitas otorgar permiso de ubicación para poder iniciar una jornada y compartir tu ubicación en tiempo real con los pasajeros.'
        );
        setLoading(false);
        return;
      }

      console.log('✅ Paso 1 completado: Permisos otorgados');

      // 2. Crear la jornada en el backend
      const payload = {
        id_conductor: session.conductor.id_conductor,
        id_unidad: session.conductor.id_unidad,
        id_ruta: session.conductor.id_ruta,
      };

      console.log('📤 Paso 2: Creando jornada en backend...');
      console.log('   Payload:', payload);

      const response = await iniciarJornada(payload);
      console.log('✅ Paso 2 completado: Respuesta del backend:', response);
      console.log('   Jornada creada:', response.data);

      // 3. Iniciar tracking de ubicación
      console.log('🚀 Paso 3: Iniciando tracking de ubicación...');

      // IMPORTANTE: Limpiar suscripción anterior si existe
      if (locationSubscription.current) {
        console.log('🧹 Limpiando suscripción de ubicación anterior...');
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      console.log('⚙️ Configuración GPS: timeInterval=3000ms (3s), distanceInterval=0m, accuracy=Balanced');
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // CAMBIADO: Balanced en lugar de High para evitar throttling
          timeInterval: 3000, // CAMBIADO: 3 segundos en lugar de 5 para compensar posible throttling
          distanceInterval: 0, // 0 metros = actualizar por tiempo, no por distancia
        },
        async (location) => {
          const { latitude, longitude } = location.coords;
          console.log('📍 Ubicación actualizada:', { latitude, longitude });

          // Actualizar estado para mostrar en UI
          setUltimaUbicacion({
            latitud: latitude,
            longitud: longitude,
            timestamp: new Date().toLocaleTimeString()
          });

          // Enviar ubicación al backend
          try {
            const response = await API.post('/conductores/location', {
              latitud: latitude,
              longitud: longitude,
            });
            console.log(`✅ Ubicación enviada: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          } catch (error) {
            console.error('❌ Error ubicación:', error.response?.status, error.response?.data?.error || error.message);
          }
        }
      );
      console.log('✅ Paso 3 completado: Tracking iniciado');

      // 4. Cargar pasajeros
      console.log('👥 Paso 4: Cargando pasajeros...');
      await cargarPasajeros();
      console.log('✅ Paso 4 completado: Pasajeros cargados');

      // 5. Iniciar actualización automática de pasajeros
      console.log('🔄 Paso 5: Iniciando actualización automática...');
      iniciarActualizacionPasajeros();
      console.log('✅ Paso 5 completado: Actualización automática iniciada');

      // 6. Marcar jornada como iniciada
      console.log('🎯 Paso 6: Marcando jornada como iniciada...');
      setJornadaIniciada(true);
      console.log('✅ Paso 6 completado: Estado actualizado a jornadaIniciada=true');

      console.log('🎉 ========== JORNADA INICIADA EXITOSAMENTE ==========');

      Alert.alert(
        '✅ Jornada Iniciada',
        `Se crearon ${response.data.paradas?.length || 0} paradas.\n\nAhora estás compartiendo tu ubicación en tiempo real.`
      );

    } catch (error) {
      console.error('❌ ========== ERROR AL INICIAR JORNADA ==========');
      console.error('Error completo:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);

      Alert.alert(
        'Error al Iniciar Jornada',
        error.response?.data?.error || error.message || 'No se pudo iniciar la jornada. Verifica tu conexión.'
      );

      // Si hubo error, asegurarse de detener el tracking
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    } finally {
      setLoading(false);
      console.log('🏁 Proceso finalizado, loading=false');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await cargarPasajeros();
    setRefreshing(false);
  };

  // Pantalla de carga mientras se verifica jornada activa
  if (verificandoJornada) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 20, fontSize: 16, color: '#666' }}>
          Verificando jornada activa...
        </Text>
      </View>
    );
  }

  // Si la jornada ya está iniciada, mostrar la tabla de pasajeros
  if (jornadaIniciada) {
    const Header = () => (
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Pasajero</Text>
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Parada</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Hora</Text>
      </View>
    );

    const Row = ({ item }) => (
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { flex: 2 }]}>{item.nombre}</Text>
        <Text style={[styles.tableCell, { flex: 2 }]}>{item.parada}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>{item.hora}</Text>
      </View>
    );

    return (
      <View style={styles.container}>
        <Text style={styles.title}>🚌 Jornada Activa</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>👤 Conductor:</Text>
          <Text style={styles.infoValue}>{session.conductor.nombre}</Text>

          <Text style={styles.infoLabel}>🚌 Unidad:</Text>
          <Text style={styles.infoValue}>{session.conductor.placa || 'No asignada'}</Text>

          <Text style={styles.infoLabel}>🛣️ Ruta:</Text>
          <Text style={styles.infoValue}>{session.conductor.nombre_ruta || 'No asignada'}</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusText}>📍 Compartiendo ubicación en tiempo real</Text>
          {ultimaUbicacion && (
            <Text style={styles.statusSubtext}>
              📡 GPS: {ultimaUbicacion.latitud.toFixed(6)}, {ultimaUbicacion.longitud.toFixed(6)} ({ultimaUbicacion.timestamp})
            </Text>
          )}
        </View>

        <View style={styles.tableContainer}>
          <Text style={styles.tableTitle}>
            Pasajeros de tu ruta hoy ({pasajeros.length})
          </Text>

          <Header />

          <FlatList
            data={pasajeros}
            renderItem={Row}
            keyExtractor={(item, index) => String(item.id_uso ?? index)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No hay pasajeros registrados para esta ruta hoy.
              </Text>
            }
            style={styles.list}
          />
        </View>
      </View>
    );
  }

  // Vista inicial antes de iniciar jornada
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Nueva Jornada</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>👤 Conductor:</Text>
        <Text style={styles.infoValue}>{session.conductor.nombre}</Text>

        <Text style={styles.infoLabel}>🚌 Unidad:</Text>
        <Text style={styles.infoValue}>{session.conductor.placa || 'No asignada'}</Text>

        <Text style={styles.infoLabel}>🛣️ Ruta:</Text>
        <Text style={styles.infoValue}>{session.conductor.nombre_ruta || 'No asignada'}</Text>
      </View>

      {/* Debug Panel */}
      <View style={styles.debugCard}>
        <Text style={styles.debugTitle}>🐛 Debug Info:</Text>
        <Text style={styles.debugText}>jornadaIniciada: {jornadaIniciada ? 'true ✅' : 'false ❌'}</Text>
        <Text style={styles.debugText}>ID Conductor: {session.conductor.id_conductor}</Text>
        <Text style={styles.debugText}>ID Ruta: {session.conductor.id_ruta}</Text>
        <Text style={styles.debugText}>ID Unidad: {session.conductor.id_unidad}</Text>
      </View>

      <Text style={styles.subtitle}>
        Al iniciar la jornada, comenzarás a compartir tu ubicación en tiempo real con los pasajeros.
      </Text>

      <Button
        title={loading ? 'Iniciando...' : 'Iniciar Jornada'}
        onPress={handleIniciarJornada}
        disabled={loading}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  debugCard: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  debugText: {
    fontSize: 10,
    color: '#856404',
    marginBottom: 2,
  },
  statusCard: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#333',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    paddingBottom: 10,
    marginBottom: 5,
  },
  tableHeaderText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#007AFF',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableCell: {
    fontSize: 14,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  list: {
    flex: 1,
  },
});

export default IniciarJornada;
