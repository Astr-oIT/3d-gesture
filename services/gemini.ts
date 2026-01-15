
import { GestureState } from '../types';

export class GestureAnalyzer {
  private detector: any;
  private intervalId: number | null = null;
  private onGestureUpdate: (state: GestureState) => void;
  private videoElement: HTMLVideoElement | null = null;
  
  // Smoothing for stable values
  private lastTension: number = 0;
  private lastExpansion: number = 0;

  constructor(onUpdate: (state: GestureState) => void) {
    this.onGestureUpdate = onUpdate;
  }

  async start(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    console.log('Starting gesture analysis with @tensorflow-models/handpose...');

    // Check if handpose is available from CDN
    if (typeof (window as any).handpose === 'undefined') {
      console.error('Handpose not loaded from CDN!');
      return;
    }

    try {
      // Load the simpler handpose model
      this.detector = await (window as any).handpose.load();
      console.log('Handpose model loaded successfully');
    } catch (error) {
      console.error('Error creating detector:', error);
      return;
    }

    console.log('Starting frame processing...');

    // Process video frames
    let errorCount = 0;
    const maxErrors = 5;
    
    const detectHands = async () => {
      if (videoElement.paused || videoElement.ended || !this.detector) {
        return;
      }
      if (errorCount >= maxErrors) {
        console.error('Too many errors, stopping detection');
        if (this.intervalId) {
          clearInterval(this.intervalId);
        }
        return;
      }
      
      try {
        // Ensure video is ready before estimating
        if (videoElement.readyState < 2) {
          console.log('Video not ready, skipping frame');
          return;
        }
        
        const predictions = await this.detector.estimateHands(videoElement);
        this.onResults(predictions);
        errorCount = 0; // Reset on success
      } catch (error) {
        errorCount++;
        console.error('Error detecting hands (count: ' + errorCount + '):', error);
      }
    };

    this.intervalId = window.setInterval(detectHands, 50);
    console.log('Frame processing started at 20 FPS');
  }

  private onResults(predictions: any[]) {
    // Debug: Check what predictions array contains
    console.log('Predictions:', predictions);
    if (predictions && predictions.length > 0) {
      console.log('First prediction:', predictions[0]);
      console.log('Landmarks:', predictions[0].landmarks);
    }
    
    if (!predictions || predictions.length === 0) {
      // No hand detected
      this.lastTension = 0;
      this.lastExpansion = 0;
      
      this.onGestureUpdate({
        tension: 0,
        expansion: 0,
        active: false
      });
      
      return;
    }

    try {
      const hand = predictions[0];
      const landmarks = hand.landmarks; // Array of [x, y, z] coordinates
      
      // Key landmark indices for handpose model
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const palmBase = landmarks[0]; // Wrist

      // Calculate hand size for normalization
      const handLength = Math.sqrt(
        Math.pow(landmarks[9][0] - landmarks[0][0], 2) + 
        Math.pow(landmarks[9][1] - landmarks[0][1], 2)
      );

      // Calculate average distance from fingertips to wrist
      const fingertips = [thumbTip, indexTip, middleTip, ringTip, pinkyTip];
      let totalDistance = 0;
      
      for (const tip of fingertips) {
        const dx = tip[0] - palmBase[0];
        const dy = tip[1] - palmBase[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        totalDistance += distance;
      }
      
      const avgDistance = totalDistance / fingertips.length;
      const normalizedDistance = avgDistance / handLength;
      
      console.log('DEBUG - avgDistance:', avgDistance.toFixed(2), 'handLength:', handLength.toFixed(2), 'normalized:', normalizedDistance.toFixed(2));
      
      // Map to 0-1 where 1 = closed fist, 0 = open hand
      let tension = Math.max(0, Math.min(1, (2.5 - normalizedDistance) / 1.0));

      // Calculate expansion (finger spread)
      const fingerSpread = Math.sqrt(
        Math.pow(indexTip[0] - pinkyTip[0], 2) + 
        Math.pow(indexTip[1] - pinkyTip[1], 2)
      );
      const normalizedSpread = fingerSpread / handLength;
      
      console.log('DEBUG - fingerSpread:', fingerSpread.toFixed(2), 'normalizedSpread:', normalizedSpread.toFixed(2));
      
      let expansion = Math.max(0, Math.min(1, (normalizedSpread - 0.4) / 0.6));
      
      // Safety check for NaN
      if (isNaN(tension)) tension = 0;
      if (isNaN(expansion)) expansion = 0;
      
      // Strong smoothing for buttery smooth gestures
      const smoothingFactor = 0.25; // 0.1 = very smooth, 0.5 = more responsive
      tension = this.lastTension + (tension - this.lastTension) * smoothingFactor;
      expansion = this.lastExpansion + (expansion - this.lastExpansion) * smoothingFactor;
      
      // Dead zone to prevent micro-movements
      if (Math.abs(tension - this.lastTension) < 0.02) tension = this.lastTension;
      if (Math.abs(expansion - this.lastExpansion) < 0.02) expansion = this.lastExpansion;
      
      // Minimum threshold
      if (tension < 0.05) tension = 0;
      if (expansion < 0.05) expansion = 0;
      
      // Store for next frame
      this.lastTension = tension;
      this.lastExpansion = expansion;
      
      // Detect additional gestures
      let gestureType = 'Neutral';
      let additionalEffect = '';
      
      // Check for pointing gesture (index finger extended, others closed)
      const indexExtended = Math.sqrt(
        Math.pow(indexTip[0] - palmBase[0], 2) + 
        Math.pow(indexTip[1] - palmBase[1], 2)
      ) / handLength > 1.8;
      
      const middleExtended = Math.sqrt(
        Math.pow(middleTip[0] - palmBase[0], 2) + 
        Math.pow(middleTip[1] - palmBase[1], 2)
      ) / handLength > 1.8;
      
      const ringClosed = Math.sqrt(
        Math.pow(ringTip[0] - palmBase[0], 2) + 
        Math.pow(ringTip[1] - palmBase[1], 2)
      ) / handLength < 1.5;
      
      // Peace sign (index + middle extended, others closed)
      const isPeaceSign = indexExtended && middleExtended && ringClosed;
      
      // Pointing (only index extended)
      const isPointing = indexExtended && !middleExtended && ringClosed;
      
      // Determine main gesture
      if (isPeaceSign) {
        gestureType = '✌️ PEACE (Color Shift)';
        additionalEffect = 'peace';
      } else if (isPointing) {
        gestureType = '☝️ POINT (Highlight)';
        additionalEffect = 'point';
      } else if (tension > 0.5) {
        gestureType = '✊ FIST (Rotate Fast)';
      } else if (tension > 0.3) {
        gestureType = '✊ FIST (Rotate)';
      } else if (expansion > 0.6) {
        gestureType = '✋ WIDE OPEN (Zoom MAX)';
      } else if (expansion > 0.3) {
        gestureType = '✋ OPEN (Zoom In)';
      } else if (expansion < 0.15 && tension < 0.15) {
        gestureType = '🤏 CLOSED (Zoom Out)';
      }
      
      console.log('Gesture:', gestureType, '- tension:', tension.toFixed(2), 'expansion:', expansion.toFixed(2));

      this.onGestureUpdate({
        tension: tension,
        expansion: expansion,
        active: true
      });
    } catch (error) {
      console.error('Error calculating gesture:', error);
      this.onGestureUpdate({
        tension: 0,
        expansion: 0,
        active: false
      });
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.detector) {
      this.detector.dispose();
    }
  }
}