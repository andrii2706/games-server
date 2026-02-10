import cors from "cors";

export const corsMiddleware = () => {
  const origin = process.env.CORS_ORIGIN;

  if (!origin) {
    console.warn("⚠️ CORS_ORIGIN is not set");
    return (req, res, next) => next();
  }

  return cors({
    origin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
};
