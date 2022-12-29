import solid from "solid-start/vite";
import { defineConfig } from "vite";
import vavite from "vavite";
import path from "path";

export default defineConfig({
  plugins: [
    solid(),
    /*vavite({
			serverEntry: "./src/server.ts",
			reloadOn: "static-deps-change",
			serveClientAssetsInDev: true,
		}),*/
  ],
  server: {
    // host: 'host.docker.internal',
    // exposePort: true,
    // middlewareMode: true,
    // hmr: {
    //     host: 'localhost',
    //   },
  },
  // root: path.resolve(__dirname, 'src'),
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
    }
  },
});
