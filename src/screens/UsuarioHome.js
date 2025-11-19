import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, {
  getJornadas,
  createUso,
  getRuta,
  getActiveConductorLocations,
} from '../api/client';

const UsuarioHome = ({ session, onLogout }) => {
  const [usuario, setUsuario] = useState(null);
  const [jornadaActiva, setJornadaActiva] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usoRegistrado, setUsoRegistrado] = useState(false);
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
        const jornadaDeRuta = jornadas.find(j => j.Unidad?.id_ruta === user.id_ruta && !j.hora_fin);
        setJornadaActiva(jornadaDeRuta || null);
        if (!jornadaDeRuta) {
            setUsoRegistrado(false);
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
    if (!usoRegistrado || !usuario?.id_ruta) return;

    let isMounted = true;
    let intervalId;

    const fetchDriverAndRoute = async () => {
      try {
        setMapLoading(true);
        // Fetch active drivers
        const { data: activeDrivers } = await getActiveConductorLocations();
        const currentDriver = activeDrivers.find(d => d.Unidad?.id_ruta === usuario.id_ruta);
        
        if (isMounted && currentDriver) {
          setDriver(currentDriver);
        } else if (isMounted) {
          setDriver(null); // No active driver for this route
        }

        // Fetch route details
        const { data: routeData } = await getRuta(usuario.id_ruta);
        if (isMounted) {
          setRoute(routeData);
        }

      } catch (error) {
        console.error("Error fetching driver or route:", error);
        if (isMounted) {
            setDriver(null);
            setRoute(null);
        }
      } finally {
        if (isMounted) {
          setMapLoading(false);
        }
      }
    };

    fetchDriverAndRoute();

    // Set up interval to refresh driver location
    intervalId = setInterval(async () => {
      try {
        const { data: activeDrivers } = await getActiveConductorLocations();
        const updatedDriver = activeDrivers.find(d => d.Unidad?.id_ruta === usuario.id_ruta);
        if (isMounted) {
          setDriver(updatedDriver || null);
        }
      } catch (error) {
        console.error("Error refreshing driver location:", error);
        if (isMounted) setDriver(null);
      }
    }, 10000); // Refresh every 10 seconds

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [usoRegistrado, usuario]);


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

  if (!usuario) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  // If usage is confirmed, show the map
  if (usoRegistrado) {
    if (mapLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text>Cargando mapa y ubicación del conductor...</Text>
        </View>
      );
    }
    if (!driver) {
        return (
            <View style={styles.centered}>
                <Text>Esperando la ubicación del conductor de tu ruta...</Text>
                <Button title="Refrescar" onPress={loadUsuarioData} />
            </View>
        )
    }
    return <LocationMap driver={driver} route={route} />;
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
          {usoRegistrado ? (
            <Text style={styles.confirmacionText}>Tu solicitud de uso ha sido enviada.</Text>
          ) : (
            <Button
              title={loading ? 'Registrando...' : 'Solicitar Uso'}
              onPress={handleCrearUso}
              disabled={loading}
            />
          )}
        </View>
      ) : (
        <Text style={styles.jornadaText}>El conductor aún no ha iniciado la jornada.</Text>
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
  confirmacionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#004d40',
    fontWeight: 'bold',
  },
});

export default UsuarioHome;