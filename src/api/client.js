// src/api/client.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Interceptor para agregar el token automáticamente a todas las peticiones
API.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token agregado a la petición:', config.url);
      } else {
        console.log('⚠️ No hay token disponible para:', config.url);
      }
    } catch (error) {
      console.error('❌ Error al obtener token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Roles
export const getRoles = () => API.get('/roles');
//roles conductor
export const getRolesC = () => API.get('/rolesconductor');


// Usuarios (usa campos: nombre, correo, contrasena, id_rol, id_ruta?, id_parada?)
export const getUsuarios = () => API.get('/usuarios');
export const createUsuario = (data) => API.post('/usuarios', data);
export const updateUsuario = (id, data) => API.put(`/usuarios/${id}`, data);
export const deleteUsuario = (id) => API.delete(`/usuarios/${id}`);
export const updateUsuarioEstado = (id, data) => API.put(`/usuarios/${id}`);



// Rutas (usa nombre_ruta, coords[{lat,lng,orden}], stops[{nombre_parada,lat,lng}], id_usuario?)
export const getRutas = () => API.get('/rutas');
export const getRuta = (id) => API.get(`/rutas/${id}`);
export const getParadasByRuta = (id) => API.get(`/rutas/${id}/paradas`);
export const createRuta = (data) => API.post('/rutas', data);
export const updateRuta = (id, data) => API.put(`/rutas/${id}`, data);
export const deleteRuta = (id) => API.delete(`/rutas/${id}`);

// Conductores (usa nombre, correo, telefono, licencia, id_unidad?)
export const getConductores = () => API.get('/conductores');
export const createConductor = (data) => API.post('/conductores', data);
export const updateConductor = (id, data) => API.put(`/conductores/${id}`, data);
export const deleteConductor = (id) => API.delete(`/conductores/${id}`);
export const getActiveConductorLocations = () => API.get('/conductores/locations/active');
// Unidades (usa placa, modelo, capacidad)
export const getUnidades = () => API.get('/unidades');
export const createUnidad = (data) => API.post('/unidades', data);
export const updateUnidad = (id, data) => API.put(`/unidades/${id}`, data);
export const deleteUnidad = (id) => API.delete(`/unidades/${id}`);
//reportes (usa tipo, descripcion, id_ruta)
export const getReportes = () => API.get('/reportes');
export const createReporte = (data) => API.post('/reportes', data);
export const deleteReporte = (id) => API.delete(`/reportes/${id}`);
// Instituciones (usa nombre, direccion, telefono)
export const getInstituciones = () => API.get('/instituciones');
export const createInstitucion = (data) => API.post('/instituciones', data);
export const updateInstitucion = (id, data) => API.put(`/instituciones/${id}`, data);
export const deleteInstitucion = (id) => API.delete(`/instituciones/${id}`);
// Contratos (usa id_institucion, id_ruta, fecha_inicio, fecha_fin)
export const getContratos = () => API.get('/contratos');
export const createContrato = (data) => API.post('/contratos', data);
export const updateContrato = (id, data) => API.put(`/contratos/${id}`, data);
export const deleteContrato = (id) => API.delete(`/contratos/${id}`);
// Jornadas (usa id_conductor, id_unidad, id_ruta, fecha, hora_inicio, hora_fin)
export const getJornadas = () => API.get('/jornadas');
export const createJornada = (data) => API.post('/jornadas', data);
export const deleteJornada = (id) => API.delete(`/jornadas/${id}`);

// Nuevos endpoints de jornadas con seguimiento de paradas
export const iniciarJornada = (data) => API.post('/jornadas/iniciar', data);
export const confirmarParada = (data) => API.post('/jornadas/confirmar-parada', data);
export const finalizarJornada = (data) => API.post('/jornadas/finalizar', data);
export const getJornadaActiva = (idConductor) => API.get(`/jornadas/activa/${idConductor}`);
export const getParadasPendientes = (idJornada) => API.get(`/jornadas/${idJornada}/paradas-pendientes`);
export const verificarProximidad = (data) => API.post('/jornadas/verificar-proximidad', data);

// usoIntencion (usa id_usuario, id_ruta, fecha, hora)
export const getUsoIntencion = () => API.get('/usointencion');
export const createUsoIntencion = (data) => API.post('/usointencion', data);
export const deleteUsoIntencion = (id) => API.delete(`/usointencion/${id}`);
export const createUso = (data) => API.post('/usointencion', data);
export const getUsos = getUsoIntencion; // Alias para mejor legibilidad

// Proximidad - Sistema de notificaciones y confirmación automática
export const verificarProximidadUsuario = async (idUsuario, ubicacion) => {
  try {
    const response = await API.post(
      `/usointencion/verificar-proximidad-usuario/${idUsuario}`,
      {
        latitud: ubicacion.latitude,
        longitud: ubicacion.longitude,
        id_jornada: ubicacion.id_jornada
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error verificando proximidad usuario:', error);
    throw error;
  }
};

export const verificarProximidadUnidad = async (ubicacion) => {
  try {
    const response = await API.post(
      '/usointencion/verificar-proximidad-unidad',
      {
        latitud: ubicacion.latitude,
        longitud: ubicacion.longitude
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error verificando proximidad unidad:', error);
    throw error;
  }
};

export const getUsosConProximidad = async (idUsuario, ubicacion) => {
  try {
    const response = await API.get(
      `/usointencion/con-proximidad/${idUsuario}`,
      {
        params: {
          latitud: ubicacion.latitude,
          longitud: ubicacion.longitude
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo usos con proximidad:', error);
    throw error;
  }
};

export { API };
export default API;
