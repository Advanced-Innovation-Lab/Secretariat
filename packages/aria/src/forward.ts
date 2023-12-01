import type { Context, Middleware } from "cloudflare-email";

export class Forward implements Middleware {
	name = "forward";

	constructor(protected readonly boss: string) {}

	async handle(ctx: Context, next: () => Promise<void>) {
		await ctx.message.forward(this.boss);
		await next();
	}
}
