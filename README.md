# chatjimmy2api

[中文文档](README_CN.md)

Convert [ChatJimmy](https://chatjimmy.ai) into an OpenAI-compatible API. Deploy to Vercel Edge in one click.

## Deploy

1. Fork this repository
2. Click the button below to deploy your fork to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/peanutsplash/chatjimmy2api&env=API_KEY&envDescription=Optional%20Bearer%20token%20for%20API%20authentication)

## Features

- **OpenAI-compatible API** — `GET /v1/models` and `POST /v1/chat/completions`
- **Streaming & non-streaming** — full SSE streaming support
- **Bearer token auth** — optional API key protection via `API_KEY` env var
- **Vercel Edge** — runs on Vercel Edge Runtime with Hono
- **Zero config** — auto-detected by Vercel CLI, ready to deploy

## Usage

Set your deployed URL as the API base and use it like OpenAI:

```bash
curl https://your-deploy.vercel.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "llama3.1-8B",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

Works with any OpenAI-compatible client:

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://your-deploy.vercel.app/v1",
    api_key="your-api-key",
)

response = client.chat.completions.create(
    model="llama3.1-8B",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)
```

## Supported Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/models` | List available models |
| `POST` | `/v1/chat/completions` | Chat completions (stream / non-stream) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | No | Bearer token for authentication. If not set, no auth is required. |

## License

[MIT](LICENSE)
