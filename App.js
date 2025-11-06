import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StatusBar, Text, View, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConductorLogin from './src/screens/ConductorLogin';
import ConductorHome from './src/screens/ConductorHome';
import IniciarJornada from './src/screens/IniciarJornada';

export default function App() {
  const [session, setSession] = useState(null);
  const [jornadaIniciada, setJornadaIniciada] = useState(false);
  const [loading, setLoading] = useState(true);
  const iniciarJornadaRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('@token');
        const conductor = await AsyncStorage.getItem('@conductor');
        if (token && conductor) {
          setSession({ token, conductor: JSON.parse(conductor) });
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
    setSession(null);
    setJornadaIniciada(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <Text>Cargando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      {session && (
        <View style={{ position: 'absolute', top: 50, right: 10, zIndex: 1 }}>
          <Button title="Cerrar Sesión" onPress={handleLogout} color="#b00020" />
        </View>
      )}
      {!session ? (
        <ConductorLogin onAuth={setSession} />
      ) : !jornadaIniciada ? (
        <IniciarJornada ref={iniciarJornadaRef} session={session} onJornadaIniciada={() => setJornadaIniciada(true)} />
      ) : (
        <ConductorHome session={session} onLogout={handleLogout} />
      )}
    </SafeAreaView>
  );
}
