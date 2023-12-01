import type { Context, Middleware } from "cloudflare-email";

export class BotPass implements Middleware {
	public name = "bot-pass";

	async handle(ctx: Context, next: () => Promise<void>) {
		if (ctx.message.isAuto() || ctx.message.headers.has("X-Auto-Response-Suppress")) {
			return;
		}
		await next();
	}
}
