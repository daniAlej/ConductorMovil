import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export default function ConductorLogin({ onAuth }) {
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        try {
            setLoading(true);
            const { data } = await api.post('/auth/conductor/login', { correo, contrasena });
            
            //console.log("Login response:", data);   // 👈 revisa token y conductor
            // Guarda sesión
            await AsyncStorage.setItem('@token', data.token);
            await AsyncStorage.setItem('@conductor', JSON.stringify(data.conductor));

            onAuth({ token: data.token, conductor: data.conductor });
            //console.log("Login data:", data);
        } catch (e) {
            const msg = e.response?.data?.error || e.message;
            console.error("Login error:", e.response?.data || e.message);
            Alert.alert('Error de inicio de sesión', msg);
        } finally {
            setLoading(false);
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
                style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
            />
            <TextInput
                placeholder="Contraseña"
                secureTextEntry
                value={contrasena}
                onChangeText={setContrasena}
                style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
            />
            <Button
                title={loading ? 'Ingresando...' : 'Ingresar'}
                onPress={handleLogin}
                disabled={loading}
            />
        </View>
    );
}
