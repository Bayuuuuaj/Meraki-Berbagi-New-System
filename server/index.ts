import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.ts";
import { registerAIRoutes } from "./ai-routes.ts";
import { serveStatic } from "./static.ts";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody?: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to prevent breaking scripts
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: "*", // Permissive during tunnel debugging to fix mobile white screen
  credentials: true
}));

// Middleware to bypass ngrok browser warning
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any;

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    capturedJsonResponse = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

async function main() {
  await registerRoutes(httpServer, app);

  // Register AI routes
  registerAIRoutes(app);

  // ✅ HEALTH CHECK ROUTE: For Render & Cron-job.org keep-alive
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'Online',
      engine: 'Offline-First Heuristic',
      timestamp: new Date().toISOString()
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
    });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite.ts");
    await setupVite(httpServer, app);
  }

  // ✅ DYNAMIC PORT: Render will provide the port via process.env.PORT
  const port = parseInt(process.env.PORT || "3000");
  httpServer.listen(port, "0.0.0.0", () => {
    log(`Antigravity Engine Aktif di Port ${port}`);
  });
}

main().catch(console.error);