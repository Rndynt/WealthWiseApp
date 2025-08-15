// netlify/functions/api.ts
import express, { type Request, Response, NextFunction } from "express";
import serverless from "serverless-http";
import session from "express-session";
import path from "path";
import { registerRoutes } from "../../server/routes";

const app = express();

// Increase body parser limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session middleware dengan persistent storage untuk serverless
app.use(session({
  secret: process.env.SESSION_SECRET || 'financeflow-session-secret-fixed-key-12345-very-long-secret',
  resave: false,
  saveUninitialized: false,
  rolling: false,
  cookie: {
    secure: false, // Netlify handles SSL termination
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days untuk persistence
    sameSite: 'lax',
    path: '/',
    domain: undefined
  },
  name: 'financeflow_session',
  // Gunakan cookie-based session untuk serverless persistence
  genid: function(req) {
    // Generate session ID yang konsisten
    return require('crypto').randomBytes(32).toString('hex');
  }
}));

// Debug middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log("🔍 Netlify Function Request:", {
    method: req.method,
    url: req.originalUrl,
    hasBody: !!req.body,
    hasSession: !!req.session,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString()
  });
  next();
});

// Serve uploaded files statically (if any)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mark session as configured before registering routes
app.set('session-configured', true);

// Register routes
registerRoutes(app);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Netlify function error:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export const handler = serverless(app);