
import React, { useState, useRef, useEffect } from 'react';
import { gemini } from '../services/geminiService.ts';

export const LiveAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputCtx = new AudioContext({ sampleRate: 16000 });

      const sessionPromise = gemini.connectAssistant({
        onopen: () => {
          const source = inputCtx.createMediaStreamSource(stream);
          const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            
            let binary = '';
            const bytes = new Uint8Array(int16.buffer);
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            
            sessionPromise.then(s => s.sendRealtimeInput({ 
              media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } 
            }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
          setIsActive(true);
          setIsConnecting(false);
        },
        onmessage: async (msg) => {
          const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData && audioContextRef.current) {
            const ctx = audioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const buffer = await decodeAudioData(decode(audioData), ctx);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
          }
          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: () => setIsActive(false),
        onclose: () => setIsActive(false)
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    setIsActive(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isActive && (
        <div className="bg-surface-dark border border-primary/30 p-4 rounded-2xl shadow-2xl w-64 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-white">Assistant Listening</span>
          </div>
          <p className="text-[11px] text-text-secondary">Ask me: "How should I structure my hero section?" or "Which style works for Fintech?"</p>
        </div>
      )}
      <button 
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 ${isActive ? 'bg-red-500 text-white' : 'bg-primary text-white'}`}
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
