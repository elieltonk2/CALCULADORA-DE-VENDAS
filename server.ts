import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON
  app.use(express.json());

  // Rotas para Políticas (Garantir que sejam acessíveis)
  app.get("/privacy.html", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "privacy.html"));
  });

  app.get("/data-deletion.html", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "data-deletion.html"));
  });

  // Configuração do Vite para desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Modo: Desenvolvimento (Vite Middleware)");
  } else {
    // Servir arquivos estáticos em produção
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Fallback para SPA (Single Page Application)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Modo: Produção (Static Files)");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar o servidor:", err);
});
