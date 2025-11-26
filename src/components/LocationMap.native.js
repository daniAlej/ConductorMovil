// src/components/LocationMap.native.js
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { decode } from '@mapbox/polyline';

const LocationMap = ({ driver, route, userStop }) => {
  const mapRef = useRef(null);

  // 1. Coordenadas del Conductor
  const driverLocation = driver && driver.latitud && driver.longitud
    ? { latitude: parseFloat(driver.latitud), longitude: parseFloat(driver.longitud) }
    : null;

  // 2. Coordenadas de la Ruta (decodificada)
  const routeCoordinates = route && route.trazado
    ? decode(route.trazado).map(point => ({ latitude: point[0], longitude: point[1] }))
    : [];

  // 3. Cálculo de la región inicial
  const getInitialRegion = () => {
    if (driverLocation) {
      return { ...driverLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }
    if (userStop) {
      return { ...userStop, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }
    // Default Quito
    return { latitude: -0.22985, longitude: -78.52498, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  };

  // Efecto para centrar el mapa si el conductor se mueve
  useEffect(() => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...driverLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [driverLocation]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getInitialRegion()}
      >
        {/* DIBUJAR RUTA (Azul) */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007bff"
            strokeWidth={4}
          />
        )}

        {/* MARCADOR USUARIO (Verde) */}
        {userStop && (
          <Marker
            coordinate={userStop}
            title="Tu Parada"
            description="Espera aquí a la unidad"
            pinColor="green" 
          />
        )}

        {/* MARCADOR CONDUCTOR (Rojo/Auto) */}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title={driver.nombre || 'Conductor'}
            description={`Unidad: ${driver.Unidad?.placa || '...'}`}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default LocationMap;