import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { BASE_URL } from '../config';

export default function ConductorLogin({ onAuth, onShowTest }) {
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        try {
            setLoading(true);

            console.log('🔐 ========== INICIANDO LOGIN ==========');
            console.log('🌐 Backend URL:', BASE_URL);
            console.log('📧 Correo:', correo);
            console.log('🔒 Contraseña:', contrasena ? '***' + contrasena.slice(-2) : '(vacía)');
            console.log('📤 Enviando petición a: /auth/conductor/login');

            const { data } = await api.post('/auth/conductor/login', { correo, contrasena });

            console.log("✅ Login exitoso");
            console.log("🔐 Login response completa:", JSON.stringify(data, null, 2));
            console.log("👤 Conductor data:", JSON.stringify(data.conductor, null, 2));
            console.log("📊 Campos clave del conductor:");
            console.log("   - id_conductor:", data.conductor.id_conductor);
            console.log("   - nombre:", data.conductor.nombre);
            console.log("   - id_ruta:", data.conductor.id_ruta || '❌ NO DEFINIDO');
            console.log("   - id_unidad:", data.conductor.id_unidad || '❌ NO DEFINIDO');
            console.log("   - nombre_ruta:", data.conductor.nombre_ruta || '❌ NO DEFINIDO');
            console.log("   - placa:", data.conductor.placa || '❌ NO DEFINIDO');

            // Guarda sesión
            await AsyncStorage.setItem('@token', data.token);
            await AsyncStorage.setItem('@conductor', JSON.stringify(data.conductor));

            console.log("💾 Datos guardados en AsyncStorage");

            onAuth({ token: data.token, conductor: data.conductor });
        } catch (e) {
            console.error('❌ ========== ERROR EN LOGIN ==========');
            console.error('📧 Correo usado:', correo);
            console.log('🌐 Backend URL:', BASE_URL);
            console.error('Error status:', e.response?.status);
            console.error('Error data:', e.response?.data);
            console.error('Error message:', e.message);

            const msg = e.response?.data?.error || e.message;
            Alert.alert('Error de inicio de sesión', msg);
        } finally {
            setLoading(false);
        }
    }

    async function handleClearStorage() {
        try {
            await AsyncStorage.clear();
            console.log('🧹 AsyncStorage limpiado');
            Alert.alert('Storage limpiado', 'Se eliminaron todos los datos guardados. Intenta iniciar sesión de nuevo.');
        } catch (e) {
            console.error('Error al limpiar storage:', e);
        }
    }

    return (
        <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 8 }}>Login Conductor</Text>
            <TextInput
                placeholder="Correo"
                autoCapitalize="none"
                keyboardType="email-address"
                value={correo}
                onChangeText={setCorreo}
                style={{ borderWidth: 1, borderRadius: 8, padding: 10, color: '#000', fontSize: 16 }}
            />
            <TextInput
                placeholder="Contraseña"
                secureTextEntry
                value={contrasena}
                onChangeText={setContrasena}
                style={{ borderWidth: 1, borderRadius: 8, padding: 10, color: '#000', fontSize: 16 }}
            />
            <Button
                title={loading ? 'Ingresando...' : 'Ingresar'}
                onPress={handleLogin}
                disabled={loading}
            />

            {/* Botón de diagnóstico */}
            <View style={{ marginTop: 10 }}>
                <Button
                    title="🔧 Probar Conexión al Servidor"
                    onPress={() => onShowTest && onShowTest()}
                    color="#2196F3"
                />
            </View>

            <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 20 }}>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 8, textAlign: 'center' }}>
                    ¿Problemas para iniciar sesión?
                </Text>
                <Button
                    title="🧹 Limpiar datos y reintentar"
                    onPress={handleClearStorage}
                    color="#FF6B6B"
                />
            </View>
        </View>
    );
}
