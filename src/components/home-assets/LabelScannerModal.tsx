"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { XIcon, CameraIcon } from "@/components/icons";

export interface ScanResult {
  brand: string;
  model: string;
  serialNumber: string;
  name: string;
  category: string;
}

interface LabelScannerModalProps {
  onScan: (result: ScanResult) => void;
  onClose: () => void;
}

export default function LabelScannerModal({
  onScan,
  onClose,
}: LabelScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState("");

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            if (!cancelled) setCameraReady(true);
          };
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera access denied. Please allow camera permissions and try again."
            : "Could not access camera. Make sure your device has a camera available.";
        setCameraError(message);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Lock orientation to portrait while camera is open
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (screen.orientation as any).lock("portrait");
      } catch { /* not supported or not allowed */ }
    };
    lockOrientation();
    return () => {
      try { screen.orientation.unlock(); } catch { /* ignore */ }
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !processing) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, processing]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || processing) return;

    setProcessing(true);
    setProcessingError("");

    // Draw the current video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Pause video to show frozen frame
    video.pause();

    try {
      // Export as JPEG blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
          "image/jpeg",
          0.85
        );
      });

      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Send to API
      const res = await fetch("/api/scan-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Scan failed");
      }

      const data: ScanResult = await res.json();

      // Check if we got any useful data
      if (!data.brand && !data.model && !data.serialNumber && !data.name) {
        throw new Error("Could not read label. Try getting closer or adjusting the angle.");
      }

      onScan(data);
      onClose();
    } catch (err) {
      setProcessingError(
        err instanceof Error ? err.message : "Failed to scan label"
      );
      // Resume video so user can try again
      video.play();
      setProcessing(false);
    }
  }, [processing, onScan, onClose]);

  function handleClose() {
    if (!processing) onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm z-10" style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}>
        <button
          onClick={handleClose}
          disabled={processing}
          className="flex items-center justify-center rounded-full p-2 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-[120ms] disabled:opacity-40"
          aria-label="Close scanner"
        >
          <XIcon width={20} height={20} />
        </button>
        <span className="text-[15px] font-medium text-white">
          Scan Product Label
        </span>
        <div className="w-9" />
      </div>

      {/* Camera feed */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="text-center px-8">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <CameraIcon width={28} height={28} className="text-white/60" />
            </div>
            <p className="text-[15px] text-white/90 mb-2">Camera Unavailable</p>
            <p className="text-[13px] text-white/60 leading-relaxed">
              {cameraError}
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2 rounded-[var(--radius-sm)] bg-white/10 text-white text-[14px] font-medium hover:bg-white/20 transition-all duration-[120ms]"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder overlay */}
            {cameraReady && !processing && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Darkened edges */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Clear center window */}
                <div className="absolute left-[8%] right-[8%] top-[20%] bottom-[30%] bg-transparent border-2 border-white/50 rounded-[var(--radius-lg)]"
                  style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)" }}
                />
                {/* Corner marks */}
                <div className="absolute left-[8%] top-[20%] w-6 h-6 border-t-3 border-l-3 border-white rounded-tl-[var(--radius-sm)]" />
                <div className="absolute right-[8%] top-[20%] w-6 h-6 border-t-3 border-r-3 border-white rounded-tr-[var(--radius-sm)]" />
                <div className="absolute left-[8%] bottom-[30%] w-6 h-6 border-b-3 border-l-3 border-white rounded-bl-[var(--radius-sm)]" />
                <div className="absolute right-[8%] bottom-[30%] w-6 h-6 border-b-3 border-r-3 border-white rounded-br-[var(--radius-sm)]" />
                {/* Instruction text */}
                <div className="absolute left-0 right-0 top-[12%] text-center">
                  <p className="text-[13px] text-white/80 font-medium">
                    Position the product label within the frame
                  </p>
                </div>
              </div>
            )}

            {/* Processing overlay */}
            {processing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                <span className="inline-block w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-[14px] text-white font-medium">
                  Reading label...
                </p>
              </div>
            )}

            {/* Loading camera indicator */}
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <span className="inline-block w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-[13px] text-white/60">Starting camera...</p>
              </div>
            )}
          </>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Error message */}
      {processingError && (
        <div className="px-4 py-2 bg-red/90 text-center">
          <p className="text-[13px] text-white">{processingError}</p>
        </div>
      )}

      {/* Capture button */}
      {!cameraError && (
        <div className="flex items-center justify-center py-6 bg-black/60 backdrop-blur-sm" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>
          <button
            onClick={handleCapture}
            disabled={!cameraReady || processing}
            className="w-[72px] h-[72px] rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-[120ms] disabled:opacity-40 disabled:hover:scale-100"
            aria-label="Capture photo"
          >
            <div className="w-[58px] h-[58px] rounded-full bg-white" />
          </button>
        </div>
      )}
    </div>
  );
}
