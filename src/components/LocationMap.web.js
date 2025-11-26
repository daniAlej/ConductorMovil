// src/components/LocationMap.web.js
import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';

const LocationMap = ({ driver, userStop }) => {
  
  const openGoogleMaps = () => {
    if (driver?.latitud && driver?.longitud) {
      const url = `https://www.google.com/maps/search/?api=1&query=${driver.latitud},${driver.longitud}`;
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vista de Mapa Web</Text>
      <Text style={styles.text}>
        El seguimiento en tiempo real está optimizado para la App Móvil.
      </Text>
      
      {driver && (
        <View style={styles.card}>
          <Text style={styles.driverText}>Conductor: {driver.nombre}</Text>
          <Text style={styles.link} onPress={openGoogleMaps}>
            📍 Ver ubicación actual en Google Maps
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  text: { fontSize: 16, color: '#666', marginBottom: 20 },
  card: { padding: 20, backgroundColor: 'white', borderRadius: 8, elevation: 3 },
  driverText: { fontSize: 18, fontWeight: 'bold' },
  link: { color: 'blue', marginTop: 10, textDecorationLine: 'underline', cursor: 'pointer' }
});

export default LocationMap;