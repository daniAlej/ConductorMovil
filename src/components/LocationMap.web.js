// src/components/LocationMap.web.js
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Iconos personalizados
const busIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/plasticine/100/000000/bus.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const stopIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/fluency/48/marker.png',
  iconSize: [35, 35],
  iconAnchor: [17.5, 35],
  popupAnchor: [0, -35],
});

const userStopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente para centrar el mapa automáticamente
function MapController({ driverLocation }) {
  const map = useMap();

  useEffect(() => {
    if (driverLocation) {
      map.flyTo([driverLocation[0], driverLocation[1]], 15, {
        duration: 1
      });
    }
  }, [driverLocation, map]);

  return null;
}

const LocationMap = ({ driver, route, userStop }) => {
  // Posición del conductor
  const driverPosition = driver && driver.latitud_actual && driver.longitud_actual
    ? [parseFloat(driver.latitud_actual), parseFloat(driver.longitud_actual)]
    : null;

  // Coordenadas de la ruta
  const routeCoords = route && route.coords ? route.coords.map(c => [c.lat, c.lng]) : [];

  // Paradas de la ruta
  const stops = route && route.stops ? route.stops : [];

  // Centro inicial del mapa
  const getInitialCenter = () => {
    if (driverPosition) {
      return driverPosition;
    }
    if (userStop) {
      return [userStop.latitude, userStop.longitude];
    }
    // Default Quito
    return [-0.22985, -78.52498];
  };

  return (
    <View style={styles.container}>
      <MapContainer
        center={getInitialCenter()}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* Tiles de CartoDB */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Controlador para centrar automáticamente */}
        <MapController driverLocation={driverPosition} />

        {/* DIBUJAR RUTA (Azul) */}
        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            color="blue"
            weight={4}
          />
        )}

        {/* MARCADORES DE PARADAS DE LA RUTA */}
        {stops.length > 0 && stops.map((stop, index) => (
          <Marker
            key={stop.id_parada || index}
            position={[parseFloat(stop.lat), parseFloat(stop.lng)]}
            icon={stopIcon}
          >
            <Popup>
              <strong>{stop.nombre_parada}</strong>
              {stop.orden && <div><small>Orden: {stop.orden}</small></div>}
            </Popup>
          </Marker>
        ))}

        {/* MARCADOR DE LA PARADA DEL USUARIO (Verde destacado) */}
        {userStop && (
          <Marker
            position={[userStop.latitude, userStop.longitude]}
            icon={userStopIcon}
          >
            <Popup>
              <strong>Tu Parada</strong><br />
              Espera aquí a la unidad
            </Popup>
          </Marker>
        )}

        {/* MARCADOR DEL CONDUCTOR (Bus) */}
        {driverPosition && (
          <Marker
            position={driverPosition}
            icon={busIcon}
          >
            <Popup>
              <strong>{driver.nombre || 'Conductor'}</strong><br />
              Unidad: {driver.Unidad?.placa || '...'}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default LocationMap;