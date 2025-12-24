'use client';

import { useEffect, useRef } from 'react';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  let radius = r;
  if (w < 2 * radius) radius = w / 2;
  if (h < 2 * radius) radius = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  className?: string;
  barColor?: string;
}

export function AudioVisualizer({
  stream,
  isRecording,
  className,
  barColor = '#8b5cf6',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) return;

    const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextCtor = w.AudioContext ?? w.webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    source.connect(analyser);

    analyserRef.current = analyser;
    sourceRef.current = source;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      if (!isRecording) return;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height; // Normalize to canvas height

        ctx.fillStyle = barColor; // Use passed color
        // Gradient effect
        // const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        // gradient.addColorStop(0, barColor);
        // gradient.addColorStop(1, '#ffffff'); // fade to white or transparent?

        // Rounded bars
        roundRect(ctx, x, height - barHeight, barWidth, barHeight, 2);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current != null) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [stream, isRecording, barColor]);

  return <canvas ref={canvasRef} width={600} height={150} className={className} />;
}
