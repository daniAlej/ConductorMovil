import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StatusBar, Text, View, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
import ConductorLogin from './src/screens/ConductorLogin';
import UsuarioLogin from './src/screens/UsuarioLogin';
import ConductorHome from './src/screens/ConductorHome';
import UsuarioHome from './src/screens/UsuarioHome';
import IniciarJornada from './src/screens/IniciarJornada';
import CrearReporte from './src/screens/CrearReporte';

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null); // 'conductor' or 'usuario'
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

        if (token) {
          if (conductor) {
            setSession({ token, conductor: JSON.parse(conductor) });
            setRole('conductor');
          } else if (usuario) {
            setSession({ token, usuario: JSON.parse(usuario) });
            setRole('usuario');
          }
        }
      } catch (e) {
        console.log('Error al cargar sesión:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAuth = (newSession) => {
    if (newSession.conductor) {
      setRole('conductor');
    } else if (newSession.usuario) {
      setRole('usuario');
    }
    setSession(newSession);
  };

  const handleLogout = async () => {
    if (iniciarJornadaRef.current) {
      iniciarJornadaRef.current.stopLocationTracking();
    }
    await AsyncStorage.multiRemove(['@token', '@conductor', '@usuario']);
    setSession(null);
    setRole(null);
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
    if (session) {
      if (role === 'conductor') {
        if (!jornadaIniciada) {
          return <IniciarJornada ref={iniciarJornadaRef} session={session} onJornadaIniciada={() => setJornadaIniciada(true)} />;
        }
        if (creandoReporte) {
          return <CrearReporte session={session} rutaId={rutaIdParaReporte} onClose={() => setCreandoReporte(false)} />;
        }
        return <ConductorHome session={session} onLogout={handleLogout} onCrearReporte={handleCrearReporte} />;
      }
      if (role === 'usuario') {
        return <UsuarioHome session={session} onLogout={handleLogout} />;
      }
    }

    if (!role) {
      return <RoleSelectionScreen onSelectRole={setRole} />;
    }

    if (role === 'conductor') {
      return <ConductorLogin onAuth={handleAuth} />;
    }

    if (role === 'usuario') {
      return <UsuarioLogin onAuth={handleAuth} />;
    }

    // Fallback por si el estado es inconsistente
    return <RoleSelectionScreen onSelectRole={setRole} />;
  };

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
