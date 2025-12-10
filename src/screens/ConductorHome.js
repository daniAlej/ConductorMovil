import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Button, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, {
  getRutas,
  getConductores,
  getUsuarios,
  getParadasByRuta,
  getRolesC,
  getUsoIntencion
} from '../api/client';

export default function ConductorHome({ session, onLogout, onCrearReporte }) {
  const [me, setMe] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [paradasRuta, setParadasRuta] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [rolesC, setRolesC] = useState([]);
  const [usoIntencion, setUsoIntencion] = useState([]);

  const token = session?.token;

  // === Cargar datos básicos ===
  async function fetchMe() {
    try {
      const jwt = token || (await AsyncStorage.getItem('@token'));
      const { data } = await api.get('/conductores/me', {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setMe(data.conductor);
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      Alert.alert('Error', msg);
    }
  }

  async function loadCatalogos() {
    try {
      const [r, u, rolesResp, usoResp] = await Promise.all([
        getRutas(),
        getUsuarios(),
        getRolesC(),
        getUsoIntencion()
      ]);
      setRutas(r.data || []);
      setUsuarios(u.data || []);
      setRolesC(rolesResp.data || []);
      setUsoIntencion(usoResp.data || []);

      // LOGS DE DEBUGGING
      console.log('📊 Catálogos cargados:', {
        rutas: r.data?.length || 0,
        usuarios: u.data?.length || 0,
        usoIntencion: usoResp.data?.length || 0
      });

      if (usoResp.data?.length > 0) {
        console.log('📋 Primer registro de usoIntencion:', JSON.stringify(usoResp.data[0], null, 2));
      }
    } catch (e) {
      console.log('Error cargando datos:', e.message);
    }
  }

  // === Identificar la ruta del conductor ===
  const rutaId = useMemo(() => {
    const idDirecto = session?.conductor?.id_ruta || me?.id_ruta;
    if (idDirecto) return idDirecto;

    const nombre = session?.conductor?.nombre_ruta || me?.nombre_ruta;
    if (!nombre || !rutas?.length) return null;
    const r = rutas.find(x => x.nombre_ruta === nombre);
    return r?.id_ruta || null;
  }, [session?.conductor, me, rutas]);

  // === Cargar paradas ===
  useEffect(() => {
    let interval;
    if (!rutaId) return;
    (async () => {
      try {
        const p = await getParadasByRuta(rutaId);
        setParadasRuta(p.data || []);
      } catch (e) {
        console.log('Error cargando paradas:', e.message);
      }
    })();
  }, [rutaId]);

  // === Resolver nombre del rol ===
  const rolNombre = useMemo(() => {
    const idRol = session?.conductor?.id_rolConductor || me?.id_rolConductor;
    if (!idRol || !rolesC?.length) return '';
    const r = rolesC.find(x => x.id_rolConductor === idRol);
    return r?.nombre || '';
  }, [rolesC, session?.conductor, me]);

  // === Usuarios de la ruta actual ===
  const usuariosDeRuta = useMemo(() => {
    if (!rutaId || !usuarios?.length) return [];
    const mapaParadas = new Map(paradasRuta.map(p => [p.id_parada, p.nombre_parada]));
    return usuarios
      .filter(u => u.id_ruta === rutaId)
      .map(u => ({
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        parada: mapaParadas.get(u.id_parada) || '(sin parada)',
      }));
  }, [rutaId, usuarios, paradasRuta]);

  // === UsoIntención filtrado por unidad del conductor ===
  const unidadConductor = session?.conductor?.id_unidad || me?.id_unidad;
  const hoy = new Date().toISOString().split('T')[0];

  const usoFiltrado = useMemo(() => {
    console.log('🔍 Filtrando usoIntencion:', {
      totalRegistros: usoIntencion?.length || 0,
      unidadConductor,
      hoy,
      rutaId,
    });

    if (!usoIntencion?.length) {
      console.log('⚠️ usoIntencion está vacío');
      return [];
    }

    // Mostrar todos los registros de usoIntencion para debugging
    console.log('📊 Todos los registros de usoIntencion:');
    usoIntencion.forEach((u, idx) => {
      console.log(`  [${idx}]:`, {
        id_uso: u.id_uso,
        id_jornada: u.id_jornada,
        id_usuario: u.id_usuario,
        fecha_jornada: u.Jornada?.fecha,
        id_unidad_jornada: u.Jornada?.id_unidad,
        id_ruta_usuario: u.Usuario?.id_ruta,
        nombre_usuario: u.Usuario?.nombre,
      });
    });

    const filtrados = usoIntencion
      .filter(u => {
        // Si no hay jornada, saltar este registro
        if (!u.Jornada) {
          console.log(`❌ Registro ${u.id_uso}: No tiene Jornada asociada`);
          return false;
        }

        const fechaUso = new Date(u.Jornada.fecha).toISOString().split('T')[0];

        // Comprobar por unidad O por ruta
        const cumpleUnidad = unidadConductor && u.Jornada.id_unidad === unidadConductor;
        const cumpleRuta = rutaId && u.Usuario?.id_ruta === rutaId;
        const cumpleFecha = fechaUso === hoy;

        const cumple = (cumpleUnidad || cumpleRuta) && cumpleFecha;

        console.log(`${cumple ? '✅' : '❌'} Registro ${u.id_uso}:`, {
          cumpleUnidad: `${cumpleUnidad} (${u.Jornada.id_unidad} === ${unidadConductor})`,
          cumpleRuta: `${cumpleRuta} (${u.Usuario?.id_ruta} === ${rutaId})`,
          cumpleFecha: `${cumpleFecha} (${fechaUso} === ${hoy})`,
        });

        return cumple;
      })
      .map(u => ({
        id_uso: u.id_uso,
        nombre_usuario: u.Usuario?.nombre || '(sin nombre)',
        parada: u.Usuario?.Parada?.nombre_parada || '(sin parada)',
        ruta: u.Usuario?.Ruta?.nombre_ruta || u.Usuario?.Rutum?.nombre_ruta || '(sin ruta)',
        fecha: new Date(u.Jornada?.fecha).toLocaleDateString(),
        placa: u.Jornada?.Unidad?.placa || '(sin placa)'
      }));

    console.log('✅ Registros filtrados:', filtrados.length);
    if (filtrados.length > 0) {
      console.log('📋 Primeros 3 pasajeros:', filtrados.slice(0, 3));
    }

    return filtrados;
  }, [usoIntencion, unidadConductor, hoy, rutaId]);

  async function logout() {
    await AsyncStorage.multiRemove(['@token', '@conductor']);
    onLogout();
  }

  useEffect(() => {
    let interval;

    async function inicializar() {
      await fetchMe();
      await loadCatalogos();

      // 🔁 refrescar cada 5 segundos
      interval = setInterval(async () => {
        try {
          const { data } = await getUsoIntencion();
          setUsoIntencion(data || []);
          console.log('🔄 usoIntencion actualizado', new Date().toLocaleTimeString());
        } catch (e) {
          console.log('Error actualizando usoIntencion:', e.message);
        }
      }, 5000);
    }

    inicializar();

    // limpieza al salir de la vista
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // === Render ===
  const Row = ({ item }) => (
    <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5 }}>
      <Text style={{ flex: 1 }}>{item.nombre_usuario}</Text>
      <Text style={{ flex: 1 }}>{item.parada}</Text>
      <Text style={{ flex: 1 }}>{item.ruta}</Text>
      <Text style={{ flex: 1 }}>{item.fecha}</Text>
    </View>
  );

  const Header = () => (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 5 }}>
      <Text style={{ flex: 1, fontWeight: '700' }}>Usuario</Text>
      <Text style={{ flex: 1, fontWeight: '700' }}>Parada</Text>
      <Text style={{ flex: 1, fontWeight: '700' }}>Ruta</Text>
      <Text style={{ flex: 1, fontWeight: '700' }}>Fecha</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Conductor Home</Text>

      <Text>Bienvenido, {session?.conductor?.nombre || me?.nombre}</Text>
      <Text>Rol: {rolNombre || '(resolviendo...)'}</Text>
      <Text>Ruta: {session?.conductor?.nombre_ruta || me?.nombre_ruta || '(sin ruta)'}</Text>
      <Text>Unidad: {unidadConductor || '(sin unidad)'}</Text>

      {/* Debug info */}
      <View style={{ backgroundColor: '#f0f0f0', padding: 10, borderRadius: 5 }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>📊 Debug Info:</Text>
        <Text style={{ fontSize: 10 }}>Total usoIntencion: {usoIntencion?.length || 0}</Text>
        <Text style={{ fontSize: 10 }}>Pasajeros filtrados: {usoFiltrado?.length || 0}</Text>
        <Text style={{ fontSize: 10 }}>Ruta ID: {rutaId || 'N/A'}</Text>
        <Text style={{ fontSize: 10 }}>Unidad ID: {unidadConductor || 'N/A'}</Text>
      </View>

      <View style={{ marginVertical: 10, flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="Crear Reporte" onPress={() => onCrearReporte(rutaId)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Cerrar Sesión" onPress={logout} color="#dc3545" />
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 6 }}>
          Pasajeros que usarán su unidad hoy:
        </Text>
        <Header />
        <FlatList
          data={usoFiltrado}
          renderItem={Row}
          keyExtractor={(i, index) => String(i.id_uso ?? index)}
          onRefresh={async () => {
            try {
              const { data } = await getUsoIntencion();
              setUsoIntencion(data || []);
            } catch (e) {
              console.log('Error al refrescar usoIntencion:', e.message);
            }
          }}
          refreshing={false}
          ListEmptyComponent={
            <Text style={{ marginTop: 8, opacity: 0.7 }}>
              No hay pasajeros confirmados para esta unidad.
            </Text>
          }
        />
      </View>
    </View>
  );
}
