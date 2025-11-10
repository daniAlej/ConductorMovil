import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StatusBar, Text, View, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConductorLogin from './src/screens/ConductorLogin';
import ConductorHome from './src/screens/ConductorHome';
import UsuarioHome from './src/screens/UsuarioHome';
import IniciarJornada from './src/screens/IniciarJornada';
import CrearReporte from './src/screens/CrearReporte';

export default function App() {
  const [session, setSession] = useState(null);
  const [jornadaIniciada, setJornadaIniciada] = useState(false);
  const [creandoReporte, setCreandoReporte] = useState(false);
  const [rutaIdParaReporte, setRutaIdParaReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const iniciarJornadaRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('@token');
        const conductor = await AsyncStorage.getItem('@conductor');
        const usuario = await AsyncStorage.getItem('@usuario');

        if (token && conductor) {
          setSession({ token, conductor: JSON.parse(conductor) });
        }
        if(token && usuario){
          setSession({ token, usuario: JSON.parse(usuario) });
        }
      } catch (e) {
        console.log('Error al cargar sesión:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    if (iniciarJornadaRef.current) {
      iniciarJornadaRef.current.stopLocationTracking();
    }
    await AsyncStorage.multiRemove(['@token', '@conductor']);
    await AsyncStorage.multiRemove(['@token', '@usuario']);
    setSession(null);
    setJornadaIniciada(false);
    setCreandoReporte(false);
  };

  const handleCrearReporte = (rutaId) => {
    setRutaIdParaReporte(rutaId);
    setCreandoReporte(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <Text>Cargando...</Text>
      </SafeAreaView>
    );
  }

  const renderContent = () => {
    if (!session) {
      return <ConductorLogin onAuth={setSession} />;
    }
    if (!jornadaIniciada) {
      return <IniciarJornada ref={iniciarJornadaRef} session={session} onJornadaIniciada={() => setJornadaIniciada(true)} />;
    }
    if (creandoReporte) {
      return <CrearReporte session={session} rutaId={rutaIdParaReporte} onClose={() => setCreandoReporte(false)} />;
    }
    return <ConductorHome session={session} onLogout={handleLogout} onCrearReporte={handleCrearReporte} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      {session && (
        <View style={{ position: 'absolute', top: 50, right: 10, zIndex: 1 }}>
          <Button title="Cerrar Sesión" onPress={handleLogout} color="#b00020" />
        </View>
      )}
      {renderContent()}
    </SafeAreaView>
  );
}
