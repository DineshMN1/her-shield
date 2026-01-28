import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// AI Processing Worker
const aiWorker = new Worker(
  'ai-processing',
  async (job: Job) => {
    console.log(`Processing AI job: ${job.id}`);
    
    if (!job) {
      throw new Error('Job is undefined');
    }

    switch (job.name) {
      case 'analyze-symptoms':
        return analyzeSymptoms(job.data);
      case 'generate-summary':
        return generateSummary(job.data);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

async function analyzeSymptoms(data: any) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Analyze these pregnancy symptoms and provide risk assessment:
Symptoms: ${data.symptoms?.join(', ') || 'None specified'}
Week: ${data.pregnancyWeek || 'Not specified'}

Provide JSON response with:
- riskLevel (low/medium/high/critical)
- urgency (1-10)
- recommendations (array)
- requiresDoctor (boolean)`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        riskLevel: 'medium',
        urgency: 5,
        recommendations: ['Consult with your doctor'],
        requiresDoctor: true,
      };
    }
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      riskLevel: 'medium',
      urgency: 5,
      recommendations: ['Please consult with your doctor'],
      requiresDoctor: true,
    };
  }
}

async function generateSummary(data: any) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Summarize this medical consultation:
${data.transcript || 'No transcript available'}

Provide brief summary with key points.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Summary generation error:', error);
    return 'Summary generation failed. Please consult the full transcript.';
  }
}

aiWorker.on('completed', (job) => {
  console.log(`✅ Job ${job?.id} completed`);
});

aiWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

console.log('🤖 AI Worker started and listening for jobs');
