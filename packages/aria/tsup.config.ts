import { defineConfig } from "tsup";
import { dependencies } from "./package.json";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	external: ["cloudflare:email"],
	noExternal: Object.keys(dependencies),
	splitting: false,
	platform: "neutral",
});
