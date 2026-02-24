# chatjimmy2api

[English](README.md)

将 [ChatJimmy](https://chatjimmy.ai) 转换为 OpenAI 兼容 API，一键部署到 Vercel Edge。

## 部署

1. Fork 本仓库
2. 点击下方按钮将你的 Fork 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/peanutsplash/chatjimmy2api&env=API_KEY&envDescription=Optional%20Bearer%20token%20for%20API%20authentication)

## 功能

- **OpenAI 兼容 API** — 支持 `GET /v1/models` 和 `POST /v1/chat/completions`
- **流式与非流式** — 完整 SSE 流式传输支持
- **Bearer Token 认证** — 通过 `API_KEY` 环境变量可选开启鉴权
- **Vercel Edge** — 基于 Hono 运行在 Vercel Edge Runtime
- **零配置** — Vercel CLI 自动识别，开箱即用

## 使用方法

将部署后的 URL 作为 API 地址，像使用 OpenAI 一样调用：

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

兼容任何 OpenAI SDK 客户端：

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

## 支持的接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/v1/models` | 获取可用模型列表 |
| `POST` | `/v1/chat/completions` | 聊天补全（流式/非流式） |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `API_KEY` | 否 | Bearer Token 鉴权密钥，不设置则无需认证 |

## 许可证

[MIT](LICENSE)
