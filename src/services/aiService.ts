import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const genAI = new GoogleGenerativeAI('AIzaSyDQVkAyAqPuonnplLxqEhhGyW_FqjteaVw');

export const aiService = {
  async sendChatMessage(message: string, userId: string, sessionId?: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message,
        userId,
        sessionId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to send chat message');
    }

    return data.message;
  },

  async generateSessionSummary(sessionId: string, userId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('generate-session-summary', {
      body: {
        sessionId,
        userId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to generate session summary');
    }

    return data.summary;
  },

  async analyzeTradeScreenshot(imageFile: File): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-vision" });
      
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/... prefix
        };
        reader.readAsDataURL(imageFile);
      });

      const prompt = `Analyze this trading screenshot and extract ALL visible trade information. Return ONLY valid JSON in this exact format:

{
  "trades": [
    {
      "symbol": "extracted_symbol",
      "side": "Long" or "Short",
      "volume": "lot_size_as_number",
      "entryPrice": "open_price_as_number",
      "exitPrice": "close_price_as_number", 
      "profit": "pl_amount_as_number",
      "openTime": "extracted_time_if_visible",
      "closeTime": "extracted_time_if_visible"
    }
  ]
}

Rules:
- Convert Buy→Long, Sell→Short
- Extract numbers only (no currency symbols)
- If multiple trades visible, include all in array
- If data not visible, use null
- Return valid JSON only, no explanations`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: imageFile.type
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        // Try to extract JSON from the response if it's wrapped in markdown
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        throw new Error('Invalid JSON response from AI');
      }
    } catch (error) {
      console.error('Screenshot analysis error:', error);
      throw new Error('Failed to analyze screenshot');
    }
  },

  async switchToSession(sessionName: string, userId: string): Promise<string | null> {
    try {
      // Get user's sessions
      const { data: sessions, error } = await supabase
        .from('trading_sessions')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', `%${sessionName}%`);

      if (error || !sessions || sessions.length === 0) {
        return null;
      }

      // Return the best match (first one for now, could be improved with fuzzy matching)
      return sessions[0].id;
    } catch (error) {
      console.error('Session switching error:', error);
      return null;
    }
  },

  getGreeting(userName?: string): string {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    const day = now.getDate();

    let timeGreeting = '';
    if (hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour < 17) {
      timeGreeting = 'Good afternoon';
    } else {
      timeGreeting = 'Good evening';
    }

    let holidayGreeting = '';
    // Christmas
    if (month === 11 && day === 25) {
      holidayGreeting = '🎄 Merry Christmas! ';
    }
    // New Year
    else if (month === 0 && day === 1) {
      holidayGreeting = '🎉 Happy New Year! ';
    }
    // Halloween
    else if (month === 9 && day === 31) {
      holidayGreeting = '🎃 Happy Halloween! ';
    }

    const name = userName ? ` ${userName}` : '';
    return `${holidayGreeting}${timeGreeting}${name}! How's your trading going today?`;
  }
};