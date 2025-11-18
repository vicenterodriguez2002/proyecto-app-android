import express from 'express';
import {
  obtenerUsuarioPorEmail,
  verificarEmail,
  eliminarUsuario,
  eliminarUsuarioSeguro,
  solicitarCodigoVerificacion,
  verificarCodigo,
  eliminarUsuarioConCodigo,
  eliminarUsuarioAndroid
} from '../controllers/ControladorUsuario.js';
import { validarApiKey } from '../middleware/apiKeyMiddleware.js';

const router = express.Router();

/**
 * GET /api/usuarios/obtener/:email
 * Obtiene los datos de un usuario por email
 */
router.get('/obtener/:email', validarApiKey, obtenerUsuarioPorEmail);

/**
 * POST /api/usuarios/verificar-eliminacion
 * Verifica que el usuario existe antes de eliminarlo
 * Body: { email: "correo@ejemplo.com" }
 */
router.post('/verificar-eliminacion', validarApiKey, verificarEmail);

/**
 * DELETE /api/usuarios/eliminar
 * Elimina un usuario y todos sus datos
 * Body: { email: "correo@ejemplo.com" }
 */
router.delete('/eliminar', validarApiKey, eliminarUsuario);

/**
 * POST /api/usuarios/eliminar-seguro
 * Elimina un usuario de forma segura requiriendo confirmación
 * Body: { email: "correo@ejemplo.com", confirmacion: "CONFIRMAR" }
 */
router.post('/eliminar-seguro', validarApiKey, eliminarUsuarioSeguro);

/**
 * POST /api/usuarios/solicitar-codigo
 * Solicita un código de verificación por email
 * Body: { email: "correo@ejemplo.com" }
 */
router.post('/solicitar-codigo', validarApiKey, solicitarCodigoVerificacion);

/**
 * POST /api/usuarios/verificar-codigo
 * Verifica el código enviado al email
 * Body: { email: "correo@ejemplo.com", codigo: "123456" }
 */
router.post('/verificar-codigo', validarApiKey, verificarCodigo);

/**
 * POST /api/usuarios/eliminar-con-codigo
 * Elimina un usuario después de verificar el código
 * Body: { email: "correo@ejemplo.com", tokenEliminacion: "token..." }
 */
router.post('/eliminar-con-codigo', validarApiKey, eliminarUsuarioConCodigo);

/**
 * POST /api/usuarios/android/eliminar
 * Elimina un usuario directo para Android (sin verificación por código)
 * Body: { email: "correo@ejemplo.com" }
 * Headers: X-API-Key: tu_api_key
 */
router.post('/android/eliminar', validarApiKey, eliminarUsuarioAndroid);

export default router;
