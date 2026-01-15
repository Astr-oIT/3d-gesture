
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { GestureState } from '../types';

export class GestureAnalyzer {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private onGestureUpdate: (state: GestureState) => void;

  constructor(onUpdate: (state: GestureState) => void) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    this.onGestureUpdate = onUpdate;
  }

  async start(videoElement: HTMLVideoElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: `
          You are a gesture control assistant. Analyze the user's hand position and movement in the video frames.
          Output a JSON object for every significant change in the following format:
          { "tension": number, "expansion": number }
          'tension' should be 0 (relaxed) to 1 (tightly clenched or high-speed movement).
          'expansion' should be 0 (closed fist/hand near body) to 1 (fingers splayed wide/hand extended).
          Keep your analysis fast and concise. Only output the raw JSON string.
        `,
      },
      callbacks: {
        onopen: () => {
          console.log('Gemini Live session opened');
          this.startStreaming(videoElement, canvas, ctx!);
        },
        onmessage: (message: LiveServerMessage) => {
          // In this implementation, we interpret the transcription if provided,
          // or we can use function calling. For simplicity, we'll try to find JSON in transcriptions.
          const text = message.serverContent?.modelTurn?.parts[0]?.text || 
                       message.serverContent?.outputTranscription?.text;
          
          if (text) {
            try {
              const jsonMatch = text.match(/\{.*\}/);
              if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                this.onGestureUpdate({
                  tension: Math.min(Math.max(data.tension || 0, 0), 1),
                  expansion: Math.min(Math.max(data.expansion || 0, 0), 1),
                  active: true
                });
              }
            } catch (e) {
              // Ignore parse errors from conversational filler
            }
          }
        },
        onerror: (e) => console.error('Gemini error:', e),
        onclose: () => console.log('Gemini session closed'),
      }
    });
  }

  private startStreaming(video: HTMLVideoElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const frameRate = 2; // Low frame rate to save tokens
    setInterval(async () => {
      if (!this.sessionPromise) return;
      
      canvas.width = video.videoWidth / 4; // Downscale
      canvas.height = video.videoHeight / 4;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            this.sessionPromise?.then(session => {
              session.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'image/jpeg' }
              });
            });
          };
        }
      }, 'image/jpeg', 0.5);
    }, 1000 / frameRate);
  }
}
