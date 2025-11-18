import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware para validar API Key
 */
export const validarApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.body.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "API Key requerida"
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      success: false,
      message: "API Key inválida"
    });
  }

  next();
};
