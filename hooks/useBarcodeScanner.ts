// Fix: Import React to make the 'React' namespace available for types like React.RefObject.
import React, { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

interface BarcodeScannerOptions {
  onIsbnDetected: (isbn: string) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const useBarcodeScanner = ({ onIsbnDetected, videoRef }: BarcodeScannerOptions) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const animationFrameId = useRef<number | null>(null);
  const detectedIsbns = useRef(new Set<string>());

  const startScanner = useCallback(async () => {
    if (!('BarcodeDetector' in window)) {
      setError('Barcode Detector API is not supported in this browser.');
      return;
    }

    if (!videoRef.current) {
        setError('Video element is not available.');
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      if (!barcodeDetectorRef.current) {
         barcodeDetectorRef.current = new window.BarcodeDetector({ formats: ['ean_13'] });
      }

      detectedIsbns.current.clear();
      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError('Could not access camera. Please grant permission.');
    }
  }, [videoRef]);

  const stopScanner = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    setIsScanning(false);
  }, [videoRef]);

  const scanFrame = useCallback(async () => {
    if (!isScanning || !barcodeDetectorRef.current || !videoRef.current || videoRef.current.readyState < 2) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    try {
      const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
      for (const barcode of barcodes) {
        if (barcode.rawValue && !detectedIsbns.current.has(barcode.rawValue)) {
          detectedIsbns.current.add(barcode.rawValue);
          onIsbnDetected(barcode.rawValue);
        }
      }
    } catch (err) {
      console.error('Error during barcode detection:', err);
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  }, [isScanning, onIsbnDetected, videoRef]);


  useEffect(() => {
    if (isScanning) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isScanning, scanFrame]);

  useEffect(() => {
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isScanning, error, startScanner, stopScanner };
};