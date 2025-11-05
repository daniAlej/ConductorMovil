import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConductorLogin from './src/screens/ConductorLogin';
import ConductorHome from './src/screens/ConductorHome';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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

  //console.log("Render App, session:", session);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <Text>Cargando...</Text>
      </SafeAreaView>
    );
  }
  //console.log("Session state:", session);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      {!session ? (
        <ConductorLogin onAuth={setSession} />
      ) : (
        <ConductorHome session={session} onLogout={() => setSession(null)} />
      )}
    </SafeAreaView>
  );
}
