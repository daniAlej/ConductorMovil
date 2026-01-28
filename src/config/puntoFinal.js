// src/config/puntoFinal.js
// Configuración del punto final de la ruta

/**
 * PUNTO FINAL DE LA RUTA
 * 
 * Cuando el conductor llegue a 20 metros de estas coordenadas,
 * el sistema detendrá automáticamente el tracking de ubicación
 * tanto del conductor como de los usuarios.
 * 
 * Para cambiar el punto final, simplemente edita las coordenadas aquí.
 */

export const PUNTO_FINAL_CONFIG = {
    // Coordenadas del punto final (reemplazar con las coordenadas reales)
    latitud: -0.172964,  // ← CAMBIAR AQUÍ
    longitud: -78.484001, // ← CAMBIAR AQUÍ

    // Distancia en metros para considerar que se llegó al punto final
    distanciaProximidad: 20, // metros

    // Nombre descriptivo del punto final (opcional)
    nombre: 'Terminal/Base',

    // Intervalo de verificación en milisegundos (cada cuánto verifica)
    intervaloVerificacion: 10000, // 10 segundos
};

/**
 * Función para actualizar las coordenadas del punto final
 * (útil si se quiere cambiar dinámicamente desde la app)
 */
export const actualizarPuntoFinal = (latitud, longitud) => {
    PUNTO_FINAL_CONFIG.latitud = latitud;
    PUNTO_FINAL_CONFIG.longitud = longitud;
    console.log(`📍 Punto final actualizado: ${latitud}, ${longitud}`);
};

export default PUNTO_FINAL_CONFIG;
