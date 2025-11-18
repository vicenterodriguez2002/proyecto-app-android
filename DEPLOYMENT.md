# Instrucciones de Deployment - WatchMe Eliminación de Cuenta

## 📋 Requisitos previos
- Node.js v20.x instalado en el servidor
- Acceso SSH o terminal del hosting
- Archivo `.env` configurado en el servidor

## 🚀 Pasos para subir la aplicación

### 1. Subir archivos al servidor
Sube todos los archivos EXCEPTO:
- `node_modules/` (se instalará en el servidor)
- `firebase/serviceAccountKey.json` (usar variables de .env)
- `.env` (crear manualmente en el servidor con tus credenciales)

### 2. Conectar por SSH y navegar al directorio
```bash
cd /home/virocacl/public_html/watchme.viroca.cl
```

### 3. Activar el entorno Node.js
```bash
source /home/virocacl/nodevenv/public_html/watchme.viroca.cl/20/bin/activate
```

### 4. Instalar dependencias
```bash
npm install
```

### 5. Crear archivo .env en el servidor
```bash
nano .env
```

Pegar el siguiente contenido (ajustar valores reales):
```env
# Configuración de Zoho Mail
ZOHO_EMAIL=noreply-watchme@viroca.cl
ZOHO_PASSWORD=tu_password_real
ZOHO_HOST=smtp.zoho.com
ZOHO_PORT=465

# Configuración de la aplicación
PORT=3000
CODIGO_EXPIRACION=30
NODE_ENV=production

# API Key para seguridad
API_KEY=watchme_secret_key_2025_eliminacion_cuenta

# Firebase Admin (NO subir la llave JSON al repo)
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=watchme-48090
FIREBASE_PRIVATE_KEY_ID=cc8c89cfb7534300a832b511b5682ae84b1815d1
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[PEGAR_AQUI_LA_PRIVATE_KEY_COMPLETA]
-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@watchme-48090.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=110599252562225279615
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40watchme-48090.iam.gserviceaccount.com
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
```

Guardar con `Ctrl+O`, Enter, `Ctrl+X`

### 6. Verificar que el archivo .htaccess existe
```bash
cat .htaccess
```

Debe contener:
```apache
PassengerBaseURI /
PassengerAppRoot /home/virocacl/public_html/watchme.viroca.cl
PassengerAppType node
PassengerStartupFile index.js
PassengerNodejs /home/virocacl/nodevenv/public_html/watchme.viroca.cl/20/bin/node
```

### 7. Reiniciar la aplicación
Desde cPanel:
- Ir a **Setup Node.js App**
- Seleccionar la aplicación
- Click en **Restart**

O por SSH:
```bash
touch tmp/restart.txt
```

## 🔗 URLs de Producción

- **API Base**: `https://watchme.viroca.cl/api/usuarios`
- **Página Web**: `https://watchme.viroca.cl/eliminar-cuenta`
- **Endpoint Android**: `https://watchme.viroca.cl/api/usuarios/android/eliminar`

## 📱 Actualizar URL en Android

Cambiar en tu código Android:
```java
String urlEliminacion = "https://watchme.viroca.cl/api/usuarios/android/eliminar";
```

## 🧪 Probar la API

```bash
curl -X POST https://watchme.viroca.cl/api/usuarios/solicitar-codigo \
  -H "Content-Type: application/json" \
  -H "X-API-Key: watchme_secret_key_2025_eliminacion_cuenta" \
  -d '{"email":"test@ejemplo.com"}'
```

## ❗ Troubleshooting

### Error: Cannot find package 'express'
**Solución**: Ejecutar `npm install` dentro del directorio con el entorno activado

### Error: Firebase Admin no conecta
**Solución**: Verificar que FIREBASE_PRIVATE_KEY tenga los saltos de línea `\n` correctos

### Error: 502 Bad Gateway
**Solución**: Revisar logs en cPanel → Setup Node.js App → Open logs

### Puerto en uso
**Solución**: El servidor usa el puerto que cPanel asigna automáticamente (variable de entorno PORT)

## 📝 Comandos útiles

```bash
# Ver logs de la aplicación
tail -f logs/nodejs.log

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Verificar variables de entorno
node -e "require('dotenv').config(); console.log(process.env.FIREBASE_PROJECT_ID)"
```
