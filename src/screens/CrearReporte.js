import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform, Image } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import api from '../api/client'; 

const CrearReporte = ({ session, onClose, rutaId }) => {
  const [tipo, setTipo] = useState('atraso');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasPermission(cameraStatus.status === 'granted');
      if (Platform.OS !== 'web') {
        const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cameraStatus.status !== 'granted' || libraryStatus.status !== 'granted') {
          Alert.alert('Permisos necesarios', 'Se necesitan permisos para la cámara y la galería para continuar.');
        }
      }
    })();
  }, []);

  const takePicture = async () => {
    if (hasPermission) {
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        setFoto(result.assets[0]);
      }
    } else {
        Alert.alert('Permiso denegado', 'No se puede acceder a la cámara.');
    }
  };

  const handleSubmit = async () => {
    if (!descripcion) {
      Alert.alert('Error', 'La descripción es obligatoria.');
      return;
    }

    const formData = new FormData();
    const fechaActual = new Date().toISOString();

    formData.append('tipo', tipo);
    formData.append('descripcion', descripcion);
    formData.append('id_ruta', rutaId);
    formData.append('id_conductor', session.conductor.id_conductor);
    formData.append('fecha', fechaActual);

    if (foto) {
        const uriParts = foto.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('foto', {
          uri: foto.uri,
          name: `reporte_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        });
    }

    try {
      const response = await api.post('/reportes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${session.token}`,
        },
      });
      Alert.alert('Éxito', 'Reporte enviado correctamente.');
      onClose();
    } catch (error) {
      console.error('Error al enviar el reporte:', error.response?.data || error.message);
      Alert.alert('Error', 'No se pudo enviar el reporte.');
    }
  };
  
  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No tienes acceso a la cámara.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Reporte</Text>
      
      <Picker
        selectedValue={tipo}
        onValueChange={(itemValue) => setTipo(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Atraso" value="atraso" />
        <Picker.Item label="Desvío" value="desvio" />
        <Picker.Item label="Cumplimiento" value="cumplimiento" />
      </Picker>

      <TextInput
        style={styles.input}
        placeholder="Descripción del reporte"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      <Button title="Tomar Foto" onPress={takePicture} />

      {foto && <Image source={{ uri: foto.uri }} style={styles.image} />}

      <View style={styles.buttonContainer}>
        <Button title="Enviar Reporte" onPress={handleSubmit} />
        <Button title="Cancelar" onPress={onClose} color="#b00020" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    fontSize: 16,
    borderRadius: 5,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  picker: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  buttonContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  image: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginTop: 20,
    borderRadius: 5,
  },
});

export default CrearReporte;
