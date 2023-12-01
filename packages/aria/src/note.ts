import type { BaseChatMessage, BaseChatParam } from "@ai-d/aid";
import { Aid } from "@ai-d/aid";
import { createMimeMessage, mailchannels, type Middleware } from "cloudflare-email";
import type { ParsedContext } from "cloudflare-email-parser";
import { OpenAI } from "openai";
import showdown from "showdown";
import { z } from "zod";

const language = "Traditional Chinese (正體中文)";

const system = [
	"As a secretary, your responsibility is to efficiently summarize and take notes about emails for your boss, ensuring no loss of critical information.",
	"Focus on identifying key updates, major announcements, and required actions.",
	"Exclude redundant details such as standard closing statements, addresses, and unsubscribe links.",
	"Use Markdown to format your notes, highlighting important information and omitting extraneous details.",
	"This approach helps in providing concise and relevant summaries that capture the essence of the email's content.",
].join(" ");

const footer = `<p>Secretary <b>Aria</b> from <a href="https://github.com/Advanced-Innovation-Lab">Advanced Innovation Lab</a>.</p>`;

export class Note implements Middleware<ParsedContext> {
	public name = "note";

	protected aid: Aid<string, BaseChatParam, BaseChatMessage[], BaseChatMessage[]>;

	constructor(openai_token: string, openai_endpoint?: string) {
		const openai = new OpenAI({ apiKey: openai_token, baseURL: openai_endpoint });
		this.aid = Aid.from(openai, { model: "gpt-3.5-turbo-1106" });
	}

	async handle(ctx: ParsedContext, next: () => Promise<void>) {
		console.log([...ctx.message.headers.entries()]);
		const content = ctx.parsed.text || "";

		const in_loop = !!ctx.parsed.html?.includes(footer);
		if (in_loop) {
			await next();
			return;
		}

		if (content.length > 80) {
			const run = this.aid.task(
				system,
				z.object({
					notes: z
						.array(z.string().describe(`Markdown in ${language}`))
						.max(10)
						.describe("One line per note, including URL if applicable"),
					summary: z.string().describe(`Markdown in ${language}`),
				}),
			);

			const { result } = await run(content.replace(/\s\s+/g, " "));

			const converter = new showdown.Converter();
			converter.setFlavor("github");
			converter.setOption("tables", true);
			converter.setOption("tasklists", true);
			converter.setOption("emoji", true);

			const summary = spacing(converter.makeHtml(result.summary));
			const notes = result.notes.map((note) => converter.makeHtml(note)).map(spacing);

			const mime = createMimeMessage();
			mime.setSender({ name: "Aria", addr: ctx.message.to });
			mime.setSubject(
				ctx.parsed.subject?.toLowerCase().startsWith("re:")
					? ctx.parsed.subject
					: `Re: ${ctx.parsed.subject}`,
			);
			mime.setRecipient({
				name: ctx.parsed.from.name,
				addr: ctx.message.from.replace(/\+caf_=([^@]+)/, ""),
			});
			mime.setHeader("In-Reply-To", ctx.parsed.messageId);
			mime.addMessage({
				contentType: "text/html",
				data: `${summary}<hr /><ul>${notes
					.map((note) => (note.includes("<li>") ? note : `<li>${note}</li>`))
					.join("")}</ul><hr />${footer}`,
			});
			await mailchannels(mime);
		}

		await next();
	}
}

// add spacing between latin and chinese characters
function spacing(content: string) {
	return content
		.replace(/([a-z0-9])([\u4e00-\u9fa5])/gi, "$1 $2")
		.replace(/([\u4e00-\u9fa5])([a-z0-9])/gi, "$1 $2");
}
