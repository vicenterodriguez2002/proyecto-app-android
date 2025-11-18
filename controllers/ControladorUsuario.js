import admin from '../firebase/FirebaseAdmin.js';
import { enviarCodigoVerificacion } from '../config/nodemailerConfig.js';
import dotenv from 'dotenv';

dotenv.config();

// Obtener referencias a Firestore y Auth
const db = admin.firestore();
const auth = admin.auth();

/**
 * Generar código aleatorio de 6 dígitos
 */
const generarCodigo = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Limpiar códigos expirados de Firestore
 */
const limpiarCodigosExpirados = async () => {
  try {
    const ahora = new Date();
    const querySnapshot = await db.collection("otp")
      .where("expiracion", "<=", ahora)
      .get();

    const batch = db.batch();
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!querySnapshot.empty) {
      await batch.commit();
      console.log(`✓ ${querySnapshot.size} códigos expirados eliminados`);
    }
  } catch (error) {
    console.error("Error al limpiar códigos expirados:", error);
  }
};

/**
 * Obtener usuario por email
 * GET /api/usuarios/obtener/:email
 */
export const obtenerUsuarioPorEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email es requerido"
      });
    }

    // Buscar usuario en Firestore por email
    const querySnapshot = await db.collection("usuarios")
      .where("email", "==", email)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    const usuario = querySnapshot.docs[0].data();
    const usuarioId = querySnapshot.docs[0].id;

    res.status(200).json({
      success: true,
      data: {
        id: usuarioId,
        ...usuario
      }
    });

  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener usuario",
      error: error.message
    });
  }
};

/**
 * Verificar email antes de eliminar
 * POST /api/usuarios/verificar-eliminacion
 * Body: { email: "correo@ejemplo.com" }
 */
export const verificarEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email es requerido"
      });
    }

    // Buscar usuario en Firestore
    const querySnapshot = await db.collection("usuarios")
      .where("email", "==", email)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado en el sistema"
      });
    }

    const usuario = querySnapshot.docs[0].data();
    const usuarioId = querySnapshot.docs[0].id;

    res.status(200).json({
      success: true,
      message: "Usuario verificado",
      data: {
        id: usuarioId,
        email: usuario.email,
        nombre: usuario.nombre || "Sin nombre registrado"
      }
    });

  } catch (error) {
    console.error("Error al verificar email:", error);
    res.status(500).json({
      success: false,
      message: "Error al verificar email",
      error: error.message
    });
  }
};

/**
 * Eliminar usuario completamente
 * DELETE /api/usuarios/eliminar
 * Body: { email: "correo@ejemplo.com" }
 */
export const eliminarUsuario = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email es requerido"
      });
    }

    // Buscar usuario en Firestore por email
    const querySnapshot = await db.collection("usuarios")
      .where("email", "==", email)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    const usuarioDoc = querySnapshot.docs[0];
    const usuarioId = usuarioDoc.id;
    const usuarioData = usuarioDoc.data();

    try {
      // 1. Eliminar usuario de Authentication
      await auth.deleteUser(usuarioId);
      console.log(`Usuario de Authentication eliminado: ${usuarioId}`);
    } catch (authError) {
      // Si hay error en Authentication, continuamos con la eliminación de Firestore
      console.warn("Advertencia al eliminar de Authentication:", authError.message);
    }

    // 2. Eliminar todos los documentos relacionados en subcollecciones
    // Por ejemplo, si existen favoritos, vistos, etc.
    const subcollections = ["favoritos", "vistos"]; // Ajusta según tus subcollecciones

    for (const subcollectionName of subcollections) {
      const subcollectionSnapshot = await db
        .collection("usuarios")
        .doc(usuarioId)
        .collection(subcollectionName)
        .get();

      for (const doc of subcollectionSnapshot.docs) {
        await doc.ref.delete();
      }
      console.log(`Subcollección '${subcollectionName}' eliminada para ${usuarioId}`);
    }

    // 3. Eliminar documento principal del usuario
    await db.collection("usuarios").doc(usuarioId).delete();
    console.log(`Usuario de Firestore eliminado: ${usuarioId}`);

    res.status(200).json({
      success: true,
      message: "Usuario y todos sus datos eliminados correctamente",
      data: {
        usuarioId: usuarioId,
        email: usuarioData.email,
        eliminadoEn: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
      error: error.message
    });
  }
};

/**
 * Eliminar usuario con verificación segura
 * POST /api/usuarios/eliminar-seguro
 * Body: { email: "correo@ejemplo.com", confirmacion: "CONFIRMAR" }
 */
export const eliminarUsuarioSeguro = async (req, res) => {
  try {
    const { email, confirmacion } = req.body;

    if (!email || !confirmacion) {
      return res.status(400).json({
        success: false,
        message: "Email y confirmación son requeridos"
      });
    }

    // Verificar que escriba "CONFIRMAR" como medida de seguridad
    if (confirmacion !== "CONFIRMAR") {
      return res.status(400).json({
        success: false,
        message: "Confirmación incorrecta. Debes escribir 'CONFIRMAR'"
      });
    }

    // Buscar usuario en Firestore por email
    const querySnapshot = await db.collection("usuarios")
      .where("email", "==", email)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    const usuarioDoc = querySnapshot.docs[0];
    const usuarioId = usuarioDoc.id;
    const usuarioData = usuarioDoc.data();

    try {
      // 1. Eliminar usuario de Authentication
      await auth.deleteUser(usuarioId);
      console.log(`Usuario de Authentication eliminado: ${usuarioId}`);
    } catch (authError) {
      console.warn("Advertencia al eliminar de Authentication:", authError.message);
    }

    // 2. Eliminar subcollecciones
    const subcollections = ["favoritos", "vistos"];

    for (const subcollectionName of subcollections) {
      const subcollectionSnapshot = await db
        .collection("usuarios")
        .doc(usuarioId)
        .collection(subcollectionName)
        .get();

      for (const doc of subcollectionSnapshot.docs) {
        await doc.ref.delete();
      }
    }

    // 3. Eliminar documento principal
    await db.collection("usuarios").doc(usuarioId).delete();

    res.status(200).json({
      success: true,
      message: "Usuario y todos sus datos han sido eliminados permanentemente",
      data: {
        usuarioId: usuarioId,
        email: usuarioData.email,
        eliminadoEn: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
      error: error.message
    });
  }
};

/**
 * Solicitar código de verificación por email
 * POST /api/usuarios/solicitar-codigo
 * Body: { email: "correo@ejemplo.com" }
 */
export const solicitarCodigoVerificacion = async (req, res) => {
  try {
    const { email, forzarReenvio } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email es requerido"
      });
    }

    // Limpiar códigos expirados
    await limpiarCodigosExpirados();

    // Buscar usuario en Firestore
    const querySnapshot = await db.collection("usuarios")
      .where("email", "==", email)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    // Verificar si ya existe un código válido para este email
    const otpExistente = await db.collection("otp")
      .where("email", "==", email)
      .where("expiracion", ">", new Date())
      .get();

    if (!otpExistente.empty && !forzarReenvio) {
      const otpData = otpExistente.docs[0].data();
      const tiempoRestante = Math.ceil((otpData.expiracion.toDate() - new Date()) / 1000 / 60); // en minutos
      
      return res.status(200).json({
        success: true,
        message: "Ya tienes un código activo. Usa el código enviado anteriormente.",
        data: {
          email: email,
          tiempoRestanteMinutos: tiempoRestante,
          puedeVerificar: true
        }
      });
    }

    // Si forzarReenvio es true, eliminar códigos existentes
    if (!otpExistente.empty) {
      const batch = db.batch();
      otpExistente.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Generar nuevo código
    const codigo = generarCodigo();
    const expiracion = new Date(Date.now() + (30 * 60 * 1000)); // 30 minutos

    // Guardar en colección otp
    await db.collection("otp").add({
      email: email,
      codigo: codigo,
      expiracion: expiracion,
      intentos: 0,
      verificado: false,
      creadoEn: new Date()
    });

    // Enviar email
    await enviarCodigoVerificacion(email, codigo);

    res.status(200).json({
      success: true,
      message: "Código enviado al correo electrónico",
      data: {
        email: email,
        validoPor: 30 // minutos
      }
    });

  } catch (error) {
    console.error("Error al solicitar código:", error);
    res.status(500).json({
      success: false,
      message: "Error al solicitar código",
      error: error.message
    });
  }
};

/**
 * Verificar código de eliminación
 * POST /api/usuarios/verificar-codigo
 * Body: { email: "correo@ejemplo.com", codigo: "123456" }
 */
export const verificarCodigo = async (req, res) => {
  try {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return res.status(400).json({
        success: false,
        message: "Email y código son requeridos"
      });
    }

    // Limpiar códigos expirados
    await limpiarCodigosExpirados();

    // Buscar código en Firestore
    const otpSnapshot = await db.collection("otp")
      .where("email", "==", email)
      .where("expiracion", ">", new Date())
      .get();

    if (otpSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: "No hay código pendiente o ha expirado"
      });
    }

    const otpDoc = otpSnapshot.docs[0];
    const otpData = otpDoc.data();

    // Verificar si coincide el código
    if (otpData.codigo !== codigo) {
      const nuevosIntentos = otpData.intentos + 1;

      // Bloquear después de 3 intentos fallidos
      if (nuevosIntentos >= 3) {
        await otpDoc.ref.delete();
        return res.status(429).json({
          success: false,
          message: "Demasiados intentos fallidos. Solicita un nuevo código."
        });
      }

      // Actualizar intentos
      await otpDoc.ref.update({ intentos: nuevosIntentos });

      return res.status(400).json({
        success: false,
        message: "Código incorrecto",
        intentosRestantes: 3 - nuevosIntentos
      });
    }

    // Código válido: generar token temporal
    const tokenEliminacion = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    await otpDoc.ref.update({
      verificado: true,
      tokenEliminacion: tokenEliminacion,
      verificadoEn: new Date()
    });

    res.status(200).json({
      success: true,
      message: "Código verificado correctamente",
      data: {
        email: email,
        tokenEliminacion: tokenEliminacion
      }
    });

  } catch (error) {
    console.error("Error al verificar código:", error);
    res.status(500).json({
      success: false,
      message: "Error al verificar código",
      error: error.message
    });
  }
};

/**
 * Eliminar usuario con verificación por código
 * POST /api/usuarios/eliminar-con-codigo
 * Body: { email: "correo@ejemplo.com", tokenEliminacion: "token..." }
 */
export const eliminarUsuarioConCodigo = async (req, res) => {
  try {
    const { email, tokenEliminacion } = req.body;

    if (!email || !tokenEliminacion) {
      return res.status(400).json({
        success: false,
        message: "Email y token son requeridos"
      });
    }

    // Limpiar códigos expirados
    await limpiarCodigosExpirados();

    // Buscar código verificado en Firestore (consulta simplificada para evitar índice compuesto)
    const otpSnapshot = await db.collection("otp")
      .where("email", "==", email)
      .where("tokenEliminacion", "==", tokenEliminacion)
      .get();

    if (otpSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: "Token inválido o no encontrado"
      });
    }

    // Validar en memoria
    const otpDoc = otpSnapshot.docs[0];
    const otpData = otpDoc.data();
    const ahora = new Date();

    if (!otpData.verificado) {
      return res.status(400).json({
        success: false,
        message: "El código no ha sido verificado"
      });
    }

    if (otpData.expiracion.toDate() <= ahora) {
      await otpDoc.ref.delete();
      return res.status(400).json({
        success: false,
        message: "El token ha expirado"
      });
    }

    // Buscar usuario
    const querySnapshot = await db.collection("usuarios")
      .where("email", "==", email)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    const usuarioDoc = querySnapshot.docs[0];
    const usuarioId = usuarioDoc.id;
    const usuarioData = usuarioDoc.data();

    try {
      // Eliminar de Authentication
      await auth.deleteUser(usuarioId);
      console.log(`Usuario de Authentication eliminado: ${usuarioId}`);
    } catch (authError) {
      console.warn("Advertencia al eliminar de Authentication:", authError.message);
    }

    // Eliminar subcollecciones
    const subcollections = ["favoritos", "vistos"];

    for (const subcollectionName of subcollections) {
      const subcollectionSnapshot = await db
        .collection("usuarios")
        .doc(usuarioId)
        .collection(subcollectionName)
        .get();

      for (const doc of subcollectionSnapshot.docs) {
        await doc.ref.delete();
      }
    }

    // Eliminar documento principal del usuario
    await db.collection("usuarios").doc(usuarioId).delete();

    // Eliminar código OTP usado
    await otpDoc.ref.delete();

    res.status(200).json({
      success: true,
      message: "Usuario eliminado correctamente",
      data: {
        usuarioId: usuarioId,
        email: usuarioData.email,
        eliminadoEn: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
      error: error.message
    });
  }
};

/**
 * Eliminar usuario directo para Android (sin verificación por código)
 * POST /api/usuarios/android/eliminar
 * Body: { email: "correo@ejemplo.com" }
 * Headers: X-API-Key: tu_api_key
 */
export const eliminarUsuarioAndroid = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email es requerido",
        code: "EMAIL_REQUIRED"
      });
    }

    // Buscar usuario en Firestore
    const querySnapshot = await db.collection("usuarios")
      .where("email", "==", email)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
        code: "USER_NOT_FOUND"
      });
    }

    const usuarioDoc = querySnapshot.docs[0];
    const usuarioId = usuarioDoc.id;
    const usuarioData = usuarioDoc.data();

    try {
      // 1. Eliminar de Authentication
      await auth.deleteUser(usuarioId);
      console.log(`✓ Usuario de Authentication eliminado: ${usuarioId}`);
    } catch (authError) {
      console.warn("⚠️ Advertencia al eliminar de Authentication:", authError.message);
    }

    // 2. Eliminar subcollecciones (favoritos, vistos, etc.)
    const subcollections = ["favoritos", "vistos"];

    for (const subcollectionName of subcollections) {
      try {
        const subcollectionSnapshot = await db
          .collection("usuarios")
          .doc(usuarioId)
          .collection(subcollectionName)
          .get();

        if (!subcollectionSnapshot.empty) {
          const batch = db.batch();
          subcollectionSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`✓ Subcollección '${subcollectionName}' eliminada (${subcollectionSnapshot.size} documentos)`);
        }
      } catch (subError) {
        console.warn(`⚠️ Error al eliminar subcollección ${subcollectionName}:`, subError.message);
      }
    }

    // 3. Eliminar documento principal del usuario
    await db.collection("usuarios").doc(usuarioId).delete();
    console.log(`✓ Usuario de Firestore eliminado: ${usuarioId}`);

    // 4. Limpiar códigos OTP relacionados
    try {
      const otpSnapshot = await db.collection("otp")
        .where("email", "==", email)
        .get();

      if (!otpSnapshot.empty) {
        const batch = db.batch();
        otpSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✓ Códigos OTP eliminados para ${email}`);
      }
    } catch (otpError) {
      console.warn("⚠️ Error al limpiar códigos OTP:", otpError.message);
    }

    // Respuesta para Android
    res.status(200).json({
      success: true,
      message: "Cuenta eliminada exitosamente",
      code: "ACCOUNT_DELETED",
      data: {
        email: usuarioData.email,
        userId: usuarioId,
        deletedAt: new Date().toISOString(),
        subcollectionsDeleted: subcollections
      }
    });

  } catch (error) {
    console.error("❌ Error al eliminar usuario (Android):", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      code: "INTERNAL_ERROR",
      error: error.message
    });
  }
};
