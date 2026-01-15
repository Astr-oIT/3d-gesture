
import { GestureState } from '../types';

export class GestureAnalyzer {
  private detector: any;
  private intervalId: number | null = null;
  private onGestureUpdate: (state: GestureState) => void;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  
  // Smoothing for stable values
  private lastTension: number = 0;
  private lastExpansion: number = 0;

  constructor(onUpdate: (state: GestureState) => void) {
    this.onGestureUpdate = onUpdate;
  }

  async start(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    console.log('Starting gesture analysis with TensorFlow.js HandPose...');

    // Create canvas overlay for visualization - SMALLER SCREEN
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.style.position = 'fixed';
    this.canvasElement.style.bottom = '20px';
    this.canvasElement.style.left = '20px';
    this.canvasElement.style.width = '400px';
    this.canvasElement.style.height = '300px';
    this.canvasElement.style.border = '3px solid #00ff00';
    this.canvasElement.style.borderRadius = '10px';
    this.canvasElement.style.zIndex = '9999';
    this.canvasElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.canvasCtx = this.canvasElement.getContext('2d');
    
    // Append to body so it's always visible
    document.body.appendChild(this.canvasElement);
    console.log('Canvas created and appended to body!');
    
    // Set canvas size
    if (this.canvasElement) {
      this.canvasElement.width = 400;
      this.canvasElement.height = 300;
    }
    
    // Draw test text initially
    if (this.canvasCtx) {
      this.canvasCtx.fillStyle = '#ffffff';
      this.canvasCtx.font = 'bold 24px Arial';
      this.canvasCtx.textAlign = 'center';
      this.canvasCtx.fillText('LOADING TENSORFLOW...', this.canvasElement.width / 2, this.canvasElement.height / 2);
      console.log('Test text drawn on canvas');
    }

    // @ts-ignore - TensorFlow loaded from CDN
    const handPoseDetection = window.handPoseDetection;

    if (!handPoseDetection) {
      console.error('TensorFlow HandPose not loaded.');
      if (this.canvasCtx) {
        this.canvasCtx.fillStyle = '#ff0000';
        this.canvasCtx.fillText('ERROR: TensorFlow not loaded!', this.canvasElement!.width / 2, this.canvasElement!.height / 2);
      }
      alert('TensorFlow library not loaded. Please refresh the page.');
      return;
    }

    console.log('TensorFlow HandPose loaded successfully');

    try {
      // Use MediaPipe runtime instead of tfjs
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
      
      if (this.canvasCtx) {
        this.canvasCtx.fillText('Creating detector...', this.canvasElement!.width / 2, this.canvasElement!.height / 2 + 60);
      }
      
      // MediaPipe runtime works better than tfjs
      this.detector = await handPoseDetection.createDetector(model, {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        maxHands: 1,
        modelType: 'full'
      });
      
      console.log('Detector created successfully with MediaPipe runtime');
    } catch (error) {
      console.error('Error creating detector:', error);
      if (this.canvasCtx) {
        this.canvasCtx.fillStyle = '#ff0000';
        this.canvasCtx.fillText('ERROR: ' + (error as Error).message, this.canvasElement!.width / 2, this.canvasElement!.height / 2);
      }
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
        const hands = await this.detector.estimateHands(videoElement);
        this.onResults(hands);
        errorCount = 0; // Reset on success
      } catch (error) {
        errorCount++;
        console.error('Error detecting hands (count: ' + errorCount + '):', error);
        
        if (this.canvasCtx && this.canvasElement) {
          this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
          this.canvasCtx.fillStyle = '#ff0000';
          this.canvasCtx.font = 'bold 32px Arial';
          this.canvasCtx.textAlign = 'center';
          this.canvasCtx.fillText('ERROR: ' + (error as Error).message, 
            this.canvasElement.width / 2, this.canvasElement.height / 2);
        }
      }
    };

    // Detect at ~15 FPS for smoother detection
    this.intervalId = window.setInterval(detectHands, 66);
    console.log('Frame processing started');
  }

  private onResults(hands: any[]) {
    
    // Debug: Check what hands array contains
    console.log('Hands array:', hands);
    if (hands && hands.length > 0) {
      console.log('First hand object:', hands[0]);
      console.log('First hand properties:', Object.keys(hands[0]));
    }
    
    // Clear and draw video feed as background
    if (this.canvasCtx && this.canvasElement && this.videoElement) {
      this.canvasCtx.save();
      // Draw video feed
      this.canvasCtx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    if (!hands || hands.length === 0) {
      // No hand detected - show message overlay
      if (this.canvasCtx && this.canvasElement) {
        this.canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.canvasCtx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.canvasCtx.fillStyle = '#ff0000';
        this.canvasCtx.font = 'bold 20px Arial';
        this.canvasCtx.textAlign = 'center';
        this.canvasCtx.fillText('No hand detected', this.canvasElement.width / 2, this.canvasElement.height / 2);
      }
      
      // Reset smoothing values when hand is removed
      this.lastTension = 0;
      this.lastExpansion = 0;
      
      this.onGestureUpdate({
        tension: 0,
        expansion: 0,
        active: false
      });
      
      if (this.canvasCtx) {
        this.canvasCtx.restore();
      }
      return;
    }

    const hand = hands[0];
    const keypoints = hand.keypoints;
    const keypoints3D = hand.keypoints3D;
    
    // Debug: Check both keypoint arrays
    console.log('2D Keypoint[0]:', keypoints[0]);
    console.log('3D Keypoint[0]:', keypoints3D[0]);
    
    // Use 3D keypoints if 2D are NaN
    const workingKeypoints = (keypoints[0].x !== undefined && !isNaN(keypoints[0].x)) ? keypoints : keypoints3D;
    console.log('Using keypoints:', workingKeypoints === keypoints ? '2D' : '3D', 'First point:', workingKeypoints[0]);
    
    // Draw hand landmarks on canvas
    if (this.canvasCtx && this.canvasElement) {
      const ctx = this.canvasCtx;
      const width = this.canvasElement.width;
      const height = this.canvasElement.height;
      const videoWidth = this.videoElement!.videoWidth;
      const videoHeight = this.videoElement!.videoHeight;

      // Draw connections
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17] // Palm
      ];

      for (const [start, end] of connections) {
        const startPoint = workingKeypoints[start];
        const endPoint = workingKeypoints[end];
        ctx.beginPath();
        ctx.moveTo(startPoint.x * width / videoWidth, startPoint.y * height / videoHeight);
        ctx.lineTo(endPoint.x * width / videoWidth, endPoint.y * height / videoHeight);
        ctx.stroke();
      }

      // Draw landmarks
      ctx.fillStyle = '#FF0000';
      for (const keypoint of workingKeypoints) {
        ctx.beginPath();
        ctx.arc(keypoint.x * width / videoWidth, keypoint.y * height / videoHeight, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    
    // Calculate tension (how closed the fist is)
    try {
      const palmBase = workingKeypoints[0]; // Wrist
      const thumbTip = workingKeypoints[4];
      const indexTip = workingKeypoints[8];
      const middleTip = workingKeypoints[12];
      const ringTip = workingKeypoints[16];
      const pinkyTip = workingKeypoints[20];

      // Calculate hand size for normalization (distance from wrist to middle finger base)
      const handLength = Math.sqrt(
        Math.pow(workingKeypoints[9].x - workingKeypoints[0].x, 2) + 
        Math.pow(workingKeypoints[9].y - workingKeypoints[0].y, 2)
      );

      // Calculate average distance from fingertips to wrist, normalized by hand size
      const fingertips = [thumbTip, indexTip, middleTip, ringTip, pinkyTip];
      let totalDistance = 0;
      
      for (const tip of fingertips) {
        const dx = tip.x - palmBase.x;
        const dy = tip.y - palmBase.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        totalDistance += distance;
      }
      
      const avgDistance = totalDistance / fingertips.length;
      const normalizedDistance = avgDistance / handLength;
      
      console.log('DEBUG - Raw avgDistance:', avgDistance.toFixed(2), 'handLength:', handLength.toFixed(2), 'normalized:', normalizedDistance.toFixed(2));
      
      // Adjusted ranges based on actual hand pose data
      // Open hand: normalized ~2.0-2.8, Closed fist: normalized ~1.2-1.8
      // Map to 0-1 where 1 = closed fist, 0 = open hand
      let tension = Math.max(0, Math.min(1, (2.5 - normalizedDistance) / 1.0));

      // Calculate expansion (how spread out the fingers are)
      const fingerSpread = Math.sqrt(
        Math.pow(indexTip.x - pinkyTip.x, 2) + 
        Math.pow(indexTip.y - pinkyTip.y, 2)
      );
      const normalizedSpread = fingerSpread / handLength;
      
      console.log('DEBUG - fingerSpread:', fingerSpread.toFixed(2), 'normalizedSpread:', normalizedSpread.toFixed(2));
      
      // Adjusted spread ranges: closed ~0.3-0.6, wide open ~0.8-1.2
      let expansion = Math.max(0, Math.min(1, (normalizedSpread - 0.4) / 0.6));
      
      // Safety check for NaN
      if (isNaN(tension)) tension = 0;
      if (isNaN(expansion)) expansion = 0;
      
      // Strong smoothing to prevent any jitter - exponential moving average
      const smoothingFactor = 0.15; // Lower = smoother (range: 0.1 to 0.5)
      tension = this.lastTension + (tension - this.lastTension) * smoothingFactor;
      expansion = this.lastExpansion + (expansion - this.lastExpansion) * smoothingFactor;
      
      // Reduced dead zone to detect more gestures
      if (tension < 0.03) tension = 0;
      if (expansion < 0.03) expansion = 0;
      
      // Store for next frame
      this.lastTension = tension;
      this.lastExpansion = expansion;
      
      // Determine gesture type
      let gestureType = 'Neutral';
      if (tension > 0.3) {
        gestureType = '✊ FIST (Rotating)';
      } else if (expansion > 0.25) {
        gestureType = '✋ OPEN (Zoom In)';
      } else if (expansion < 0.15 && tension < 0.15) {
        gestureType = '🤏 CLOSED (Zoom Out)';
      }
      
      console.log('Gesture:', gestureType, '- tension:', tension.toFixed(2), 'expansion:', expansion.toFixed(2));

      // Draw gesture values overlay
      if (this.canvasCtx && this.canvasElement) {
        // Semi-transparent background for text
        this.canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.canvasCtx.fillRect(0, 0, this.canvasElement.width, 110);
        
        // Gesture type label (large)
        this.canvasCtx.fillStyle = '#FFD700';
        this.canvasCtx.font = 'bold 18px Arial';
        this.canvasCtx.textAlign = 'left';
        this.canvasCtx.fillText(gestureType, 10, 25);
        
        // Values
        this.canvasCtx.fillStyle = '#00FF00';
        this.canvasCtx.font = 'bold 14px Arial';
        this.canvasCtx.fillText(`Tension: ${tension.toFixed(2)}`, 10, 50);
        this.canvasCtx.fillText(`Expansion: ${expansion.toFixed(2)}`, 10, 70);
        
        // Small bars
        const barWidth = 150;
        const barHeight = 6;
        
        // Tension bar
        this.canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.canvasCtx.fillRect(120, 44, barWidth, barHeight);
        this.canvasCtx.fillStyle = '#00eaff';
        this.canvasCtx.fillRect(120, 44, barWidth * tension, barHeight);
        
        // Expansion bar
        this.canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.canvasCtx.fillRect(120, 64, barWidth, barHeight);
        this.canvasCtx.fillStyle = '#b600ff';
        this.canvasCtx.fillRect(120, 64, barWidth * expansion, barHeight);
        
        // Hand detected indicator
        this.canvasCtx.fillStyle = '#00FF00';
        this.canvasCtx.font = 'bold 12px Arial';
        this.canvasCtx.fillText('✓ Hand Detected', 10, 90);
        
        // Instructions
        this.canvasCtx.fillStyle = '#888888';
        this.canvasCtx.font = '11px Arial';
        this.canvasCtx.fillText('Make fist to rotate • Open to zoom in', 10, 105);
      }

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
    
    if (this.canvasCtx) {
      this.canvasCtx.restore();
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
    if (this.canvasElement && this.canvasElement.parentElement) {
      this.canvasElement.parentElement.removeChild(this.canvasElement);
    }
  }
}
