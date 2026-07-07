import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Démo à distance via tunnel (cloudflared/ngrok) : le proxy fait passer
    // l'API par la même origine que le front, donc pas de CORS ni de souci
    // de cookie cross-site à gérer côté backend — un seul tunnel suffit.
    // allowedHosts:true car l'hôte vu par Vite est celui du tunnel, pas
    // localhost (protection anti-DNS-rebinding de Vite sinon).
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        // Le cookie refresh du backend a Path=/auth (relatif à /auth/login
        // côté backend) — vu du navigateur la requête passe par /api/auth/*,
        // donc sans ce rewrite le cookie ne serait jamais renvoyé ensuite.
        cookiePathRewrite: "/",
      },
    },
  },
});
