// Helper for fetch with timeout
async function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}
import { NextRequest } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

const SYSTEM_PROMPT = `You are a caring and knowledgeable maternal health AI assistant for the Health SOS app. Your role is to help pregnant mothers with health-related questions.

Guidelines:
- Provide helpful, accurate information about pregnancy, maternal health, nutrition, common symptoms, and baby development
- Be warm, empathetic, and supportive in your responses
- Always remind users to consult their doctor for medical decisions
- If someone describes an emergency (severe bleeding, intense pain, loss of consciousness, seizures), immediately tell them to call emergency services or use the SOS feature
- Cover topics: pregnancy symptoms, nutrition, exercise, fetal development, common concerns, postpartum care, breastfeeding, mental health
- Keep responses concise but informative (2-4 paragraphs max)
- Use simple language, avoid excessive medical jargon
- Never diagnose conditions - only provide general information
- If asked about medications, always say "consult your doctor before taking any medication"
- You can discuss trimester-specific advice, common tests, and what to expect

You are NOT a replacement for medical professionals. Always encourage regular prenatal checkups.`;

// Auto-detect provider from API key format
function detectProvider(apiKey: string): string {
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-')) return 'openai';
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('AI') || apiKey.length === 39) return 'gemini';
  // Default to gemini as it's most common free option
  return 'gemini';
}

async function callGemini(apiKey: string, messages: { role: string; content: string }[]) {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    },
    10000
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
}

async function callOpenAI(apiKey: string, messages: { role: string; content: string }[]) {
  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
}

async function callAnthropic(apiKey: string, messages: { role: string; content: string }[]) {
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || 'Sorry, I could not generate a response.';
}

async function callGroq(apiKey: string, messages: { role: string; content: string }[]) {
  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {

    const { message, history } = await request.json();

    if (!message?.trim()) {
      return Response.json({ message: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { message: 'AI service not configured. Please add AI_API_KEY to environment variables.' },
        { status: 503 }
      );
    }

    const provider = process.env.AI_PROVIDER || detectProvider(apiKey);

    // Sanitize and filter conversation history (last 10 valid messages)
    const conversationHistory = Array.isArray(history)
      ? history
          .filter((m: any) => m && typeof m.role === 'string' && typeof m.content === 'string')
          .slice(-10)
          .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))
      : [];

    // Add current user message if valid
    if (typeof message === 'string' && message.trim()) {
      conversationHistory.push({ role: 'user', content: message });
    }

    let responseText: string;

    switch (provider) {
      case 'gemini':
        responseText = await callGemini(apiKey, conversationHistory);
        break;
      case 'openai':
        responseText = await callOpenAI(apiKey, conversationHistory);
        break;
      case 'anthropic':
        responseText = await callAnthropic(apiKey, conversationHistory);
        break;
      case 'groq':
        responseText = await callGroq(apiKey, conversationHistory);
        break;
      default:
        responseText = await callGemini(apiKey, conversationHistory);
    }

    return Response.json({ response: responseText });
  } catch (error: unknown) {
    console.error('AI chat error:', error);
    return Response.json(
      { message: 'AI service unavailable' },
      { status: 500 }
    );
  }
}
