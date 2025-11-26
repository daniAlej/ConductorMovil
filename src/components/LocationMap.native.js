// src/components/LocationMap.native.js
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, UrlTile, Callout } from 'react-native-maps';

const LocationMap = ({ driver, route, userStop }) => {
  const mapRef = useRef(null);

  // 1. Coordenadas del Conductor
  const driverLocation = driver && driver.latitud_actual && driver.longitud_actual
    ? { latitude: parseFloat(driver.latitud_actual), longitude: parseFloat(driver.longitud_actual) }
    : null;

  // 2. Coordenadas de la Ruta - convertir a números
  const routeCoordinates = route && route.coords
    ? route.coords.map(c => ({ latitude: parseFloat(c.lat), longitude: parseFloat(c.lng) }))
    : [];

  // 3. Paradas de la ruta
  const stops = route && route.stops ? route.stops : [];

  // 4. Cálculo de la región inicial
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
        mapType="none"
      >
        {/* Tiles de CartoDB - Basado en OpenStreetMap pero permite uso en apps */}
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {/* DIBUJAR RUTA (Azul) */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="blue"
            strokeWidth={4}
          />
        )}

        {/* MARCADORES DE PARADAS DE LA RUTA */}
        {stops.length > 0 && stops.map((stop, index) => (
          <Marker
            key={stop.id_parada || index}
            coordinate={{
              latitude: parseFloat(stop.lat),
              longitude: parseFloat(stop.lng)
            }}
            pinColor="orange"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{stop.nombre_parada}</Text>
                {stop.orden && <Text style={styles.calloutText}>Orden: {stop.orden}</Text>}
              </View>
            </Callout>
          </Marker>
        ))}

        {/* MARCADOR DE LA PARADA DEL USUARIO (Verde destacado) */}
        {userStop && (
          <Marker
            coordinate={userStop}
            pinColor="green"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>Tu Parada</Text>
                <Text style={styles.calloutText}>Espera aquí a la unidad</Text>
              </View>
            </Callout>
          </Marker>
        )}

        {/* MARCADOR DEL CONDUCTOR (Rojo/Auto) - Se ve diferente a las paradas */}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            pinColor="red"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{driver.nombre || 'Conductor'}</Text>
                <Text style={styles.calloutText}>Unidad: {driver.Unidad?.placa || '...'}</Text>
              </View>
            </Callout>
          </Marker>
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
  callout: {
    padding: 10,
    minWidth: 150,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutText: {
    fontSize: 12,
    color: '#666',
  },
});

export default LocationMap;