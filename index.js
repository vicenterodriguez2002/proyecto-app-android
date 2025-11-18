import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import './firebase/FirebaseAdmin.js';
import usuarioRuta from './routes/usuarioRuta.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: "WatchMe - API de Eliminación de Cuenta",
    version: "1.0.0",
    endpoints: {
      web: "/eliminar-cuenta",
      api: "/api/usuarios",
      android: "/api/usuarios/android/eliminar"
    },
    documentation: "https://github.com/vicenterodriguez2002/proyecto-app-android"
  });
});

// Ruta para servir la vista de eliminación (sin API Key)
app.get('/eliminar-cuenta', (req, res) => {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : (process.env.NODE_ENV === 'production' 
      ? 'https://proyecto-app-android.vercel.app' 
      : `http://localhost:${PORT}`);
  
  res.render('eliminar', {
    apiKey: process.env.API_KEY,
    apiUrl: `${baseUrl}/api/usuarios`
  });
});

// Rutas de API (con API Key protegidas)
app.use('/api/usuarios', usuarioRuta);

app.listen(PORT, () => {
  console.log(`✓ Servidor corriendo en puerto ${PORT}`);
  console.log(`✓ API disponible en http://localhost:${PORT}/api/usuarios`);
  console.log(`✓ Página de eliminación: http://localhost:${PORT}/eliminar-cuenta`);
});
