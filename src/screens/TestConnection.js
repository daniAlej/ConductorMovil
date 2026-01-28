import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { BASE_URL } from '../config';
import api from '../api/client';

export default function TestConnection() {
    const [status, setStatus] = useState('No probado aún');
    const [details, setDetails] = useState('');

    const testConnection = async () => {
        try {
            setStatus('🔄 Probando conexión...');
            setDetails(`URL Base: ${BASE_URL}`);

            console.log('🧪 Iniciando prueba de conexión');
            console.log('🌐 URL Base:', BASE_URL);

            // Prueba 1: Conexión básica
            const response = await api.get('/');

            setStatus('✅ CONEXIÓN EXITOSA');
            setDetails(JSON.stringify(response.data, null, 2));
            console.log('✅ Respuesta:', response.data);

        } catch (error) {
            console.error('❌ Error de conexión:', error);
            console.error('Error message:', error.message);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);

            setStatus('❌ ERROR DE CONEXIÓN');

            let errorDetails = `Error: ${error.message}\n\n`;
            errorDetails += `URL intentada: ${BASE_URL}\n\n`;

            if (error.response) {
                errorDetails += `Status: ${error.response.status}\n`;
                errorDetails += `Data: ${JSON.stringify(error.response.data, null, 2)}`;
            } else if (error.request) {
                errorDetails += 'No se recibió respuesta del servidor.\n';
                errorDetails += 'Posibles causas:\n';
                errorDetails += '- El servidor no está corriendo\n';
                errorDetails += '- Problemas de red/firewall\n';
                errorDetails += '- URL incorrecta';
            }

            setDetails(errorDetails);
        }
    };

    const testLogin = async () => {
        try {
            setStatus('🔄 Probando login...');

            const testCredentials = {
                correo: 'daniel@hotmail.com',
                contrasena: '1234'

            };

            console.log('🧪 Probando login con:', testCredentials.correo);

            const response = await api.post('/auth/conductor/login', testCredentials);

            setStatus('✅ LOGIN EXITOSO');
            setDetails(JSON.stringify(response.data, null, 2));
            console.log('✅ Login exitoso:', response.data);

        } catch (error) {
            console.error('❌ Error en login:', error);

            setStatus('❌ ERROR EN LOGIN');

            let errorDetails = `Error: ${error.message}\n\n`;

            if (error.response) {
                errorDetails += `Status: ${error.response.status}\n`;
                errorDetails += `Error del servidor: ${JSON.stringify(error.response.data, null, 2)}`;
            } else {
                errorDetails += 'No se pudo conectar al servidor';
            }

            setDetails(errorDetails);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>🔧 Test de Conexión</Text>

            <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>URL Configurada:</Text>
                <Text style={styles.infoValue}>{BASE_URL}</Text>
            </View>

            <View style={styles.buttonContainer}>
                <Button title="🌐 Probar Conexión Básica" onPress={testConnection} />
            </View>

            <View style={styles.buttonContainer}>
                <Button title="🔐 Probar Login" onPress={testLogin} color="#4CAF50" />
            </View>

            <View style={styles.statusBox}>
                <Text style={styles.statusTitle}>Estado:</Text>
                <Text style={styles.statusText}>{status}</Text>
            </View>

            {details ? (
                <View style={styles.detailsBox}>
                    <Text style={styles.detailsTitle}>Detalles:</Text>
                    <ScrollView style={styles.detailsScroll}>
                        <Text style={styles.detailsText}>{details}</Text>
                    </ScrollView>
                </View>
            ) : null}

            <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>📋 Instrucciones:</Text>
                <Text style={styles.instructionsText}>
                    1. Presiona "Probar Conexión Básica" primero{'\n'}
                    2. Si falla, revisa la consola para más detalles{'\n'}
                    3. Si funciona, prueba "Probar Login"{'\n'}
                    4. Usa credenciales válidas de tu base de datos
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    infoBox: {
        backgroundColor: '#e3f2fd',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#2196F3',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1976D2',
        marginBottom: 5,
    },
    infoValue: {
        fontSize: 12,
        color: '#333',
        fontFamily: 'monospace',
    },
    buttonContainer: {
        marginBottom: 15,
    },
    statusBox: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#333',
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    statusText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    detailsBox: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        maxHeight: 300,
    },
    detailsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    detailsScroll: {
        maxHeight: 250,
    },
    detailsText: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#333',
    },
    instructionsBox: {
        backgroundColor: '#fff3cd',
        padding: 15,
        borderRadius: 8,
        marginTop: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ffc107',
    },
    instructionsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#856404',
    },
    instructionsText: {
        fontSize: 12,
        color: '#856404',
        lineHeight: 18,
    },
});
