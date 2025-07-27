# 🤖 AI Setup Guide

This guide will help you configure AI features for email summarization, reply generation, and autocompletion.

## 🚀 Quick Setup

### 1. Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Configure Environment Variables

Add these variables to your `.env` file:

```env
# AI Configuration
VITE_AI_PROVIDER=gemini
VITE_GEMINI_API_KEY=your_api_key_here
VITE_AI_MODEL=gemini-2.0-flash
VITE_AI_RATE_LIMIT_PER_MINUTE=10
```

### 3. Restart Development Server

```bash
pnpm dev
```

## 🎯 Available Features

### ✨ Email Summarization

- **Location**: Email timeline items
- **Button**: "Summarize" with sparkles icon
- **Function**: Generates concise summaries of email conversations
- **Supports**: Single emails and email threads

### 🔄 Smart Replies (Coming Soon)

- Positive responses
- Negative responses
- Custom prompt-based replies

### ⌨️ Auto-completion (Coming Soon)

- Smart text completion while typing
- Context-aware suggestions
- Debounced for performance

## 🔧 Supported AI Providers

### Google Gemini (Primary)

- **Models**: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`
- **Setup**: Requires `VITE_GEMINI_API_KEY`
- **Rate Limits**: Configurable via `VITE_AI_RATE_LIMIT_PER_MINUTE`

### Future Providers

- OpenAI GPT (planned)
- Anthropic Claude (planned)

## 🐛 Troubleshooting

### Error: "AI initialization failed"

**Common Causes:**

1. **Missing API Key**: Ensure `VITE_GEMINI_API_KEY` is set
2. **Invalid Model**: Check `VITE_AI_MODEL` is supported
3. **Network Issues**: Check internet connection

**Solutions:**

```bash
# Check environment variables
echo $VITE_GEMINI_API_KEY
echo $VITE_AI_MODEL

# Restart development server
pnpm dev
```

### Error: "AI not configured"

**Cause**: Environment variables not loaded properly

**Solution:**

1. Verify `.env` file is in project root
2. Restart development server
3. Check browser dev tools for environment variables

### Error: "Rate limit exceeded"

**Cause**: Too many API requests

**Solutions:**

1. Increase `VITE_AI_RATE_LIMIT_PER_MINUTE`
2. Wait for rate limit reset
3. Clear AI cache in settings

### Error: "Invalid API key"

**Cause**: Incorrect or expired API key

**Solutions:**

1. Generate new API key from Google AI Studio
2. Update `VITE_GEMINI_API_KEY`
3. Restart application

## 🎛️ Configuration Options

### Model Selection

```env
# Fast and cost-effective
VITE_AI_MODEL=gemini-2.0-flash

# More capable, higher cost
VITE_AI_MODEL=gemini-1.5-pro
```

### Rate Limiting

```env
# Conservative (default)
VITE_AI_RATE_LIMIT_PER_MINUTE=10

# Higher usage
VITE_AI_RATE_LIMIT_PER_MINUTE=20
```

### Provider Switching

```env
# Switch between providers (future)
VITE_AI_PROVIDER=gemini  # or openai, anthropic
```

## 🏗️ Architecture

### Components

- `EmailSummaryButton` - UI for email summarization
- `AIStatusIndicator` - Shows AI configuration status
- `useEmailAI` - Main React hook for AI operations

### Services

- `EmailAIRepository` - Central AI operations manager
- `GeminiProvider` - Google Gemini integration
- `AIProviderFactory` - Provider management

### Features

- **Caching**: 10-minute TTL for responses
- **Rate Limiting**: Configurable requests per minute
- **Error Handling**: Graceful fallbacks and user feedback
- **Provider Abstraction**: Easy to add new AI providers

## 📊 Usage Statistics

Access AI usage stats via the `useEmailAI` hook:

```typescript
const { getStats } = useEmailAI()
const stats = getStats()
console.log(stats)
```

## 🔐 Security

- API keys are stored as environment variables
- No AI responses are logged or stored permanently
- Rate limiting prevents API abuse
- Error messages don't expose sensitive information

## 🆘 Getting Help

If you're still having issues:

1. Check browser console for detailed error messages
2. Use the `AIStatusIndicator` component for debugging
3. Verify your API key has the correct permissions
4. Test connection using the status indicator

## 🚀 Performance Tips

1. **Enable Caching**: Responses are cached for 10 minutes
2. **Optimize Rate Limits**: Adjust based on your API quota
3. **Use Flash Models**: `gemini-2.0-flash` is faster and cheaper
4. **Batch Operations**: Summarize entire threads vs individual emails
