import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export default function UsuarioLogin({ onAuth, onShowTest }) {
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleLogin() {
        try {
            setLoading(true);
            setError(''); // Clear previous errors
            const { data } = await api.post('/auth/usuario/login', { correo, contrasena });

            // Guarda sesión
            await AsyncStorage.setItem('@token', data.token);
            await AsyncStorage.setItem('@usuario', JSON.stringify(data.usuario));

            onAuth({ token: data.token, usuario: data.usuario });
        } catch (e) {
            console.log("❌ LOGIN ERROR DETALLADO:");
            if (e.response) {
                // El servidor respondió con un código de estado fuera del rango 2xx
                console.log("Status:", e.response.status); // ¿Es 400, 401, 404, 500?
                console.log("Data:", e.response.data);
                console.log("Headers:", e.response.headers);

                const msg = e.response.data?.error || "Error del servidor";
                setError(`Error ${e.response.status}: ${msg}`);
            } else if (e.request) {
                // La petición se hizo pero no se recibió respuesta (Timeout o Network Error)
                console.log("No hubo respuesta del servidor (Network Error)");
                console.log(e.request);
                setError("No se pudo conectar con el servidor. Revisa tu internet.");
            } else {
                // Algo pasó al configurar la petición
                console.log("Error de configuración:", e.message);
                setError(e.message);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 8 }}>Login Usuario</Text>
            <TextInput
                placeholder="Correo"
                autoCapitalize="none"
                keyboardType="email-address"
                value={correo}
                onChangeText={(text) => { setCorreo(text); setError(''); }} // Clear error on change
                style={{ borderWidth: 1, borderRadius: 8, padding: 10, color: '#000', fontSize: 16 }}
            />
            <TextInput
                placeholder="Contraseña"
                secureTextEntry
                value={contrasena}
                onChangeText={(text) => { setContrasena(text); setError(''); }} // Clear error on change
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

            {error ? <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text> : null}
        </View>
    );
}