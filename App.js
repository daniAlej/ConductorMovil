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
import TestConnection from './src/screens/TestConnection';

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null); // 'conductor' or 'usuario'
  const [jornadaIniciada, setJornadaIniciada] = useState(false);
  const [creandoReporte, setCreandoReporte] = useState(false);
  const [rutaIdParaReporte, setRutaIdParaReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTestConnection, setShowTestConnection] = useState(false);
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
    console.log('📝 handleCrearReporte llamado');
    console.log('   rutaId:', rutaId);
    console.log('   Estado antes:', { creandoReporte, jornadaIniciada });
    setRutaIdParaReporte(rutaId);
    setCreandoReporte(true);
    console.log('   Cambiando creandoReporte a true');
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
    console.log('🎨 renderContent - Estado:', {
      hasSession: !!session,
      role,
      creandoReporte,
      jornadaIniciada,
      showTestConnection
    });

    // Pantalla de diagnóstico (tiene prioridad sobre todo si está activa)
    if (showTestConnection) {
      console.log('   → Renderizando: TestConnection');
      return (
        <View style={{ flex: 1 }}>
          <View style={{ position: 'absolute', top: 10, left: 10, zIndex: 999 }}>
            <Button title="← Volver" onPress={() => setShowTestConnection(false)} />
          </View>
          <TestConnection />
        </View>
      );
    }

    if (session) {
      if (role === 'conductor') {
        // Si está creando un reporte, mostrar el formulario
        if (creandoReporte) {
          console.log('   → Renderizando: CrearReporte');
          return <CrearReporte session={session} rutaId={rutaIdParaReporte} onClose={() => setCreandoReporte(false)} />;
        }
        // Siempre mostrar IniciarJornada (maneja su propio estado de jornada iniciada/no iniciada)
        console.log('   → Renderizando: IniciarJornada');
        return <IniciarJornada ref={iniciarJornadaRef} session={session} onJornadaIniciada={() => setJornadaIniciada(true)} onCrearReporte={handleCrearReporte} />;
      }
      if (role === 'usuario') {
        return <UsuarioHome session={session} onLogout={handleLogout} />;
      }
    }

    if (!role) {
      return <RoleSelectionScreen onLogin={handleAuth} onSelectRole={setRole} />;
    }

    if (role === 'conductor') {
      return <ConductorLogin onAuth={handleAuth} onShowTest={() => setShowTestConnection(true)} />;
    }

    if (role === 'usuario') {
      return <UsuarioLogin onAuth={handleAuth} onShowTest={() => setShowTestConnection(true)} />;
    }

    // Fallback por si el estado es inconsistente
    return <RoleSelectionScreen onLogin={handleAuth} onSelectRole={setRole} />;
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
