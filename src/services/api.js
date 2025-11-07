import { API } from '../api/client';

export const iniciarJornada = (token) => {
  return API.post('/jornadas/iniciar-jornada', {}, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const updateConductorLocation = (latitud, longitud, token) => {
  return API.post('/conductores/location', { latitud, longitud }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};


export const updateUsuarioLocation = (id_usuario, latitud, longitud, token) => {
  return API.post(`/usuarios/${id_usuario}/location`, { latitud, longitud }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const getActiveConductorLocations = (token) => {
  return API.get('/conductores/locations/active', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const getActiveUserLocations = (token) => {
  return API.get('/usuarios/locations/active', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};