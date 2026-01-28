import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  // Public endpoint (no auth required for testing)
  @Post('chat')
  async chat(@Body() body: { message: string }) {
    if (!body.message || body.message.trim() === '') {
      return { response: 'Please ask me a question about pregnancy care.' };
    }
    return this.aiService.chat(body.message);
  }

  // Protected endpoint (requires authentication)
  @Post('chat/secure')
  @UseGuards(JwtAuthGuard)
  async chatSecure(@Body() body: { message: string }, @Req() req: any) {
    if (!body.message || body.message.trim() === '') {
      return { response: 'Please ask me a question about pregnancy care.' };
    }
    const userId = req.user?.id || req.user?.sub;
    return this.aiService.chat(body.message, userId);
  }
}
