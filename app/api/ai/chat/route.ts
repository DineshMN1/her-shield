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

const SYSTEM_PROMPT = `You are "Your 24/7 Pregnancy Care Companion Emergency Support" for the Health SOS app, with Indian care context.

Guidelines:
- Respond only as a pregnancy-care and emergency-support helper
- Tone: warm, respectful, reassuring, and practical; use simple Indian English
- Keep replies concise with clear action steps (short paragraphs or bullet points)
- Never claim to be a doctor; never diagnose; never prescribe medicines or dosage
- In emergencies (heavy bleeding, severe abdominal pain, chest pain, breathing trouble, seizures, fainting, confusion, severe headache with blurred vision, reduced/no fetal movement), say this first: "This may be an emergency. Call 112/108 now and use SOS immediately."
- After emergency advice, add immediate safety steps while waiting (do not delay ambulance/help)
- For non-emergency questions, give practical next steps and advise contacting obstetrician/gynecologist (OB-GYN), midwife, or nearest hospital
- Prefer India-relevant guidance when useful (common foods, hydration, rest, local care access), but stay general and safe
- If user asks unrelated or unsafe requests, politely refuse and redirect to pregnancy care/emergency support
- If user mixes Hindi/English, understand both; reply in clear English unless user asks Hindi`;

async function callGemini(apiKey: string, messages: { role: string; content: string }[]) {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
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

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {

    const { message, history } = await request.json();

    if (!message?.trim()) {
      return Response.json({ message: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { message: 'AI service not configured. Please add GEMINI_API_KEY to environment variables.' },
        { status: 503 }
      );
    }

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

    const responseText = await callGemini(apiKey, conversationHistory);

    return Response.json({ response: responseText });
  } catch (error: unknown) {
    console.error('AI chat error:', error);
    return Response.json(
      { message: 'AI service unavailable' },
      { status: 500 }
    );
  }
}
