
import React, { useState, useRef, useEffect } from 'react';
import { gemini } from '../services/geminiService.ts';

export const LiveAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Refs for managing audio resources and session
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const isActiveRef = useRef(false); // Ref to track active state inside callbacks

  // Sync state with ref
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Decode Base64 to Uint8Array
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Decode raw PCM to AudioBuffer
  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const cleanup = () => {
    // Stop all currently playing audio
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();

    // Disconnect input nodes
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }

    // Close input audio context
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }

    // Stop microphone stream tracks
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }

    // Close output audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    
    // Close Gemini session
    if (sessionRef.current) {
        sessionRef.current.close(); 
        sessionRef.current = null;
    }

    nextStartTimeRef.current = 0;
    setIsActive(false);
    setIsConnecting(false);
  };

  const startSession = async () => {
    if (isActive || isConnecting) return;
    setIsConnecting(true);

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Initialize Audio Contexts
      // Output: 24kHz for Gemini response
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      // Input: 16kHz for sending to Gemini
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });

      const sessionPromise = gemini.connectAssistant({
        onopen: () => {
          if (!inputAudioContextRef.current) return;
          
          const source = inputAudioContextRef.current.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
          
          sourceRef.current = source;
          processorRef.current = scriptProcessor;

          scriptProcessor.onaudioprocess = (e) => {
            if (!isActiveRef.current) return; 

            const inputData = e.inputBuffer.getChannelData(0);
            
            // Convert Float32 to Int16 for PCM
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            
            // Encode to binary string manually to avoid external lib dependency
            let binary = '';
            const bytes = new Uint8Array(int16.buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
            
            // Send audio chunk
            sessionPromise.then(s => {
                if(s) {
                    try {
                        s.sendRealtimeInput({ 
                            media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } 
                        });
                    } catch(e) {
                         // Session might be closed
                    }
                }
            });
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current.destination);
          
          setIsActive(true);
          setIsConnecting(false);
        },
        onmessage: async (msg) => {
          // Handle Audio Response
          const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData && audioContextRef.current) {
            const ctx = audioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            
            const buffer = await decodeAudioData(decode(audioData), ctx);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            
            source.onended = () => {
                sourcesRef.current.delete(source);
            };

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
          }
          
          // Handle Interruption (User speaks)
          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
            });
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => {
            console.error('Gemini Live Error:', e);
            cleanup();
        },
        onclose: () => {
            cleanup();
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start session:', err);
      cleanup();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isActive && (
        <div className="bg-surface-dark border border-primary/30 p-4 rounded-2xl shadow-2xl w-64 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-white">Live Assistant Active</span>
          </div>
          <p className="text-[11px] text-text-secondary">I'm listening. Ask for help with components, styles, or copy.</p>
        </div>
      )}
      <button 
        onClick={isActive ? cleanup : startSession}
        disabled={isConnecting}
        className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 ${isActive ? 'bg-red-500 text-white' : 'bg-primary text-white'}`}
        title={isActive ? "Stop Voice Assistant" : "Start Voice Assistant"}
      >
        {isConnecting ? (
          <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <span className="material-symbols-outlined text-2xl">{isActive ? 'close' : 'mic'}</span>
        )}
      </button>
    </div>
  );
};
