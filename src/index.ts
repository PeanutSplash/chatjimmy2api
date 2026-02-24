import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bearerAuth } from 'hono/bearer-auth'
import { streamSSE } from 'hono/streaming'

const app = new Hono().basePath('/v1')

// CORS
app.use('*', cors())

// Auth
app.use('*', async (c, next) => {
	const apiKey = process.env.API_KEY
	if (!apiKey) return next()
	const middleware = bearerAuth({ token: apiKey })
	return middleware(c, next)
})

// ---- Types ----

interface ChatMessage {
	role: 'system' | 'user' | 'assistant'
	content: string
}

interface CompletionRequest {
	model?: string
	messages: ChatMessage[]
	stream?: boolean
	temperature?: number
	top_p?: number
	max_tokens?: number
}

interface ChatJimmyRequest {
	messages: ChatMessage[]
	chatOptions: {
		selectedModel: string
		systemPrompt: string
		topK: number
	}
	attachment: null
}

// ---- Helpers ----

const UPSTREAM = 'https://chatjimmy.ai/api/chat'

function generateId(): string {
	return 'chatcmpl-' + Math.random().toString(36).slice(2, 14)
}

function stripStats(text: string): string {
	return text.replace(/<\|stats\|>[\s\S]*?<\|\/stats\|>/g, '')
}

function buildUpstreamBody(body: CompletionRequest): ChatJimmyRequest {
	let systemPrompt = ''
	const messages: ChatMessage[] = []

	for (const msg of body.messages) {
		if (msg.role === 'system') {
			systemPrompt += (systemPrompt ? '\n' : '') + msg.content
		} else {
			messages.push({ role: msg.role, content: msg.content })
		}
	}

	return {
		messages,
		chatOptions: {
			selectedModel: body.model || 'llama3.1-8B',
			systemPrompt,
			topK: 8,
		},
		attachment: null,
	}
}

// ---- Routes ----

// GET /v1/models
app.get('/models', (c) => {
	return c.json({
		object: 'list',
		data: [
			{
				id: 'llama3.1-8B',
				object: 'model',
				created: 1700000000,
				owned_by: 'chatjimmy',
			},
		],
	})
})

// POST /v1/chat/completions
app.post('/chat/completions', async (c) => {
	const body = await c.req.json<CompletionRequest>()
	const stream = body.stream ?? false
	const chatId = generateId()
	const created = Math.floor(Date.now() / 1000)
	const model = body.model || 'llama3.1-8B'

	const upstreamBody = buildUpstreamBody(body)

	let upstream: Response
	try {
		upstream = await fetch(UPSTREAM, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(upstreamBody),
		})
	} catch {
		return c.json(
			{ error: { message: 'Failed to connect to upstream', type: 'server_error' } },
			502,
		)
	}

	if (!upstream.ok) {
		return c.json({ error: { message: 'Upstream error', type: 'server_error' } }, 502)
	}

	if (!upstream.body) {
		return c.json({ error: { message: 'Empty upstream response', type: 'server_error' } }, 502)
	}

	if (stream) {
		return streamSSE(c, async (sseStream) => {
			// Initial chunk with role
			await sseStream.writeSSE({
				data: JSON.stringify({
					id: chatId,
					object: 'chat.completion.chunk',
					created,
					model,
					choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }],
				}),
			})

			const reader = upstream.body!.getReader()
			const decoder = new TextDecoder()
			let buffer = ''

			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })

				const statsStart = buffer.indexOf('<|stats|>')
				let toSend: string

				if (statsStart !== -1) {
					toSend = buffer.substring(0, statsStart)
					buffer = '' // discard stats and everything after
				} else {
					// Keep last 9 chars to handle '<|stats|>' split across chunks
					const keep = Math.min(buffer.length, 9)
					toSend = buffer.substring(0, buffer.length - keep)
					buffer = buffer.substring(buffer.length - keep)
				}

				if (toSend) {
					await sseStream.writeSSE({
						data: JSON.stringify({
							id: chatId,
							object: 'chat.completion.chunk',
							created,
							model,
							choices: [{ index: 0, delta: { content: toSend }, finish_reason: null }],
						}),
					})
				}

				if (statsStart !== -1) break
			}

			// Flush remaining buffer (strip any stats)
			const remaining = stripStats(buffer)
			if (remaining) {
				await sseStream.writeSSE({
					data: JSON.stringify({
						id: chatId,
						object: 'chat.completion.chunk',
						created,
						model,
						choices: [{ index: 0, delta: { content: remaining }, finish_reason: null }],
					}),
				})
			}

			// Finish chunk
			await sseStream.writeSSE({
				data: JSON.stringify({
					id: chatId,
					object: 'chat.completion.chunk',
					created,
					model,
					choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
				}),
			})

			await sseStream.writeSSE({ data: '[DONE]' })
		})
	}

	// Non-streaming: accumulate full response
	const reader = upstream.body.getReader()
	const decoder = new TextDecoder()
	let fullText = ''

	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		fullText += decoder.decode(value, { stream: true })
	}
	fullText += decoder.decode()

	const content = stripStats(fullText).trim()

	return c.json({
		id: chatId,
		object: 'chat.completion',
		created,
		model,
		choices: [
			{
				index: 0,
				message: { role: 'assistant', content },
				finish_reason: 'stop',
			},
		],
		usage: {
			prompt_tokens: 0,
			completion_tokens: 0,
			total_tokens: 0,
		},
	})
})

export default app
