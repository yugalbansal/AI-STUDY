
export class AssemblyAIService {
  private apiKey: string;
  private websocket: WebSocket | null = null;
  private isConnected = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async startRealTimeTranscription(config: {
    onTranscript: (transcript: string, isFinal: boolean) => void;
    onError: (error: any) => void;
  }) {
    try {
      // Get temporary token for real-time transcription
      const tokenResponse = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
        },
        body: JSON.stringify({ expires_in: 3600 })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get AssemblyAI token');
      }

      const { token } = await tokenResponse.json();
      
      // Connect to WebSocket
      const websocketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`;
      this.websocket = new WebSocket(websocketUrl);

      return new Promise<void>((resolve, reject) => {
        if (!this.websocket) return reject(new Error('WebSocket not initialized'));

        this.websocket.onopen = () => {
          console.log('AssemblyAI WebSocket connected');
          this.isConnected = true;
          resolve();
        };

        this.websocket.onmessage = (message) => {
          const data = JSON.parse(message.data);
          
          if (data.message_type === 'FinalTranscript' || data.message_type === 'PartialTranscript') {
            const transcript = data.text || '';
            const isFinal = data.message_type === 'FinalTranscript';
            
            if (transcript.trim()) {
              config.onTranscript(transcript, isFinal);
            }
          }
        };

        this.websocket.onerror = (error) => {
          console.error('AssemblyAI WebSocket error:', error);
          config.onError(error);
          reject(error);
        };

        this.websocket.onclose = () => {
          console.log('AssemblyAI WebSocket closed');
          this.isConnected = false;
        };
      });
    } catch (error) {
      console.error('Error starting AssemblyAI transcription:', error);
      config.onError(error);
      throw error;
    }
  }

  sendAudioData(audioBlob: Blob) {
    if (!this.websocket || !this.isConnected) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer && this.websocket?.readyState === WebSocket.OPEN) {
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(reader.result)));
        this.websocket.send(JSON.stringify({
          audio_data: base64Audio
        }));
      }
    };
    reader.readAsArrayBuffer(audioBlob);
  }

  stopRealTimeTranscription() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
    }
  }
}
