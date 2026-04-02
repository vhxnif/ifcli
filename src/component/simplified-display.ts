/* eslint-disable @typescript-eslint/no-unused-vars */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { LLMResultChunk } from "../llm/llm-types";
import {
	type LLMNotifyMessageType,
	llmNotifyMessage,
	llmNotifyMessageColor,
} from "../llm/llm-utils";
import { print, println } from "../util/common-utils";
import { OraShow } from "./ora-show";
import type { ChalkChatBoxTheme, ChalkTerminalColor } from "./theme/theme-type";

export class SimplifiedDisplay {
	private theme: ChalkChatBoxTheme;
	private color: ChalkTerminalColor;
	private spinner?: OraShow;

	private reasoningContent: string[] = [];
	private assistantContent: string[] = [];
	private toolsContent: string[] = [];

	private pendingToolName: string | null = null;
	private currentRole: "idle" | "reasoning" | "assistant" | "tools" = "idle";

	private hasReasoningStopped: boolean = false;

	constructor({
		color,
		theme,
		enableSpinner = true,
	}: {
		color: ChalkTerminalColor;
		theme: ChalkChatBoxTheme;
		enableSpinner?: boolean;
	}) {
		this.theme = theme;
		this.color = color;
		if (enableSpinner) {
			this.spinner = new OraShow(this.notice("waiting"));
			this.spinner.start();
		}
	}

	private notice(type: LLMNotifyMessageType) {
		return this.color[llmNotifyMessageColor[type]](llmNotifyMessage[type]);
	}

	think(reasoning: string): void {
		this.spinner?.stop();

		if (this.currentRole !== "reasoning") {
			if (this.currentRole !== "idle") {
				println("");
			}
			this.currentRole = "reasoning";
		}

		this.reasoningContent.push(reasoning);
		print(this.theme.reasoner.content(reasoning));
	}

	stopThink(): void {
		// 如果有推理内容，输出空行分隔
		if (this.reasoningContent.length > 0 && !this.hasReasoningStopped) {
			this.hasReasoningStopped = true;
			println(""); // 推理内容最后没有换行，先换行结束
			println(""); // 输出空行，分隔推理和助手内容
			this.currentRole = "idle";
		}
		this.spinner?.start();
	}

	contentShow(content: string): void {
		this.spinner?.stop();

		if (this.currentRole !== "assistant") {
			if (this.currentRole !== "idle") {
				println("");
			}
			this.currentRole = "assistant";
		}

		this.assistantContent.push(content);
		print(this.theme.assisant.content(content));
	}

	contentStop(): void {
		println(""); // 结束助手内容
		println(""); // 空行
		this.currentRole = "idle";
	}

	toolCall(
		_mcpServer: string,
		_mcpVersion: string,
		funName: string,
		_args: string,
	): void {
		this.spinner?.stop();
		this.pendingToolName = funName;
	}

	toolCallResult(result: string): void {
		this.toolsContent.push(result);

		if (this.currentRole !== "tools") {
			if (this.currentRole !== "idle") {
				println("");
			}
			this.currentRole = "tools";
		}

		const isSuccess = this.checkToolResult(result);

		if (this.pendingToolName) {
			const textColor = this.theme.tools.title;
			const statusColor = isSuccess ? this.color.green : this.color.red;
			const statusSymbol = isSuccess ? "✓" : "✗";

			println(
				textColor(`[${this.pendingToolName}] `) + statusColor(statusSymbol),
			);

			this.pendingToolName = null;
		}

		this.spinner?.start(this.notice("rendering"));
	}

	private checkToolResult(content: string): boolean {
		try {
			const res: CallToolResult = JSON.parse(content);
			return !res.isError;
		} catch {
			return false;
		}
	}

	change(type: LLMNotifyMessageType): void {
		this.spinner?.show(this.notice(type));
	}

	error(): void {
		this.spinner?.fail(this.notice("error"));
	}

	result(): LLMResultChunk {
		return {
			tools: this.toolsContent,
			assistant: this.assistantContent,
			reasoning: this.reasoningContent,
		};
	}
}
