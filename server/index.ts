import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup Vite or static serving
if (process.env.NODE_ENV === "development") {
  await setupVite(app);
} else {
  serveStatic(app);
}

// Register all routes
const server = await registerRoutes(app);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log(`Error: ${err.message}`, err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// ALWAYS serve the app on the port specified in the environment variable PORT
// Other ports are firewalled. Default to 5000 if not specified.
// this serves both the API and the client.
// It is the only port that is not firewalled.
const port = parseInt(process.env.PORT || '5000', 10);
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  log(`serving on port ${port}`);
});