import { API } from '../api/client';

export const iniciarJornada = (token) => {
  return API.post('/jornadas/iniciar-jornada', {}, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const actualizarUbicacion = (token, latitude, longitude) => {
  return API.post('/actualizar-ubicacion', { latitude, longitude }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};