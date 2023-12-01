import { EmailKit } from "cloudflare-email";
import { Parser } from "cloudflare-email-parser";
import debug from "debug";
import { Note } from "./note";
import { BotPass } from "./pass";

debug.enable("aid*");

export interface Env {
	OPENAI_API_KEY: string;
	OPENAI_API_ENDPOINT?: string;
}

export default {
	async email(msg, env) {
		const kit = build(env);
		await kit.process(msg);
	},
} satisfies ExportedHandler<Env>;

function build(env: Env) {
	const kit = new EmailKit()
		.use(new BotPass())
		.use(new Parser())
		.use(new Note(env.OPENAI_API_KEY, env.OPENAI_API_ENDPOINT));

	return kit;
}
