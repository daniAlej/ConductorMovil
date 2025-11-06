import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { requestForegroundPermissionsAsync, watchPositionAsync, Accuracy } from 'expo-location';
import { iniciarJornada, actualizarUbicacion } from '../services/api';

const IniciarJornada = forwardRef(({ session, onJornadaIniciada }, ref) => {
  const [loading, setLoading] = useState(false);
  const locationSubscription = useRef(null);

  useImperativeHandle(ref, () => ({
    stopLocationTracking: () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    },
  }));

  const handleIniciarJornada = async () => {
    setLoading(true);
    try {
      // 1. Iniciar la jornada en el backend
      await iniciarJornada(session.token);

      // 2. Pedir permisos de ubicación
      let { status } = await requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso de ubicación para iniciar la jornada.');
        setLoading(false);
        return;
      }

      // 3. Empezar a trackear la ubicación
      locationSubscription.current = await watchPositionAsync(
        {
          accuracy: Accuracy.High,
          timeInterval: 10000, // cada 10 segundos
          distanceInterval: 10, // cada 10 metros
        },
        (location) => {
          console.log('Nueva ubicación:', location.coords);
          actualizarUbicacion(session.token, location.coords.latitude, location.coords.longitude)
            .catch(error => console.error('Error al enviar ubicación:', error));
        }
      );

      // 4. Navegar a la pantalla principal
      onJornadaIniciada();

    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar la jornada. Por favor, inténtalo de nuevo.');
      console.error('Error al iniciar jornada:', error);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Nueva Jornada</Text>
      <Text style={styles.subtitle}>
        Presiona el botón para comenzar a compartir tu ubicación con los pasajeros de tu unidad.
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
});

export default IniciarJornada;
