/**
 * LocalEats SA Psychoacoustic Audio Notification System
 * 
 * Powered by pure HTML5 Web Audio API to prevent external file HTTP/CORS errors
 * and provide ultra-low latency, custom-tailored psychological audio sound design.
 */

export type SoundType = 
  | 'placed'      // Ascending warm major triad (C4-E4-G4-C5) - Triggers satisfaction, anticipation
  | 'confirmed'   // Dual elegant high chimes (G5-C6) - Signifies movement, secure progress
  | 'preparing'   // Soft kitchen bubble pop (F4-A4-F4) - Gentle status confirmation
  | 'ready'       // Rhythmic triple-chime (E5-A5-E6) - Clear, bright dopamine-hit alert
  | 'dispatched'  // Optimistic rising sweep (F4 through C6) - Journey, excitement, travel
  | 'delivered'   // Celebratory rich chord (C5-G5-C6-E6) - Release, reward, accomplishment
  | 'cancelled'   // Soft low-register dual descent (G3-E3) - Disappointment but calm & safe
  | 'alert';      // Soft organic notification pop (sharp decay) - Clean attention-grabber

class AudioHelper {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      } catch (e) {
        console.warn('AudioContext not supported:', e);
      }
    }
    // Resume context if suspended (browser autoplay policy)
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuteStatus() {
    return this.isMuted;
  }

  /**
   * Main function to play custom sound wave designs on-demand
   */
  public play(type: SoundType) {
    if (this.isMuted || typeof window === 'undefined') return;

    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (type) {
      case 'placed': {
        // Ascending major triad: C4 (261.63), E4 (329.63), G4 (392.00), C5 (523.25)
        const notes = [261.63, 329.63, 392.00, 523.25];
        const duration = 0.15;
        
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.12);
          
          gain.gain.setValueAtTime(0, now + index * 0.12);
          gain.gain.linearRampToValueAtTime(0.18, now + index * 0.12 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + duration + 0.2);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + index * 0.12);
          osc.stop(now + index * 0.12 + duration + 0.25);
        });
        break;
      }

      case 'confirmed': {
        // Dual beautiful high chime: G5 (783.99) -> C6 (1046.50)
        const notes = [783.99, 1046.50];
        const times = [0, 0.1];
        
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          // Use triangle wave for a softer, wood-chime tone
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + times[index]);
          
          gain.gain.setValueAtTime(0, now + times[index]);
          gain.gain.linearRampToValueAtTime(0.2, now + times[index] + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + times[index] + 0.5);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + times[index]);
          osc.stop(now + times[index] + 0.6);
        });
        break;
      }

      case 'preparing': {
        // F4 (349.23) -> A4 (440.00) soft popping pulses
        const notes = [349.23, 440.00];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.15);
          
          gain.gain.setValueAtTime(0, now + index * 0.15);
          gain.gain.linearRampToValueAtTime(0.12, now + index * 0.15 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 0.15);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + index * 0.15);
          osc.stop(now + index * 0.15 + 0.25);
        });
        break;
      }

      case 'ready': {
        // High attention, super bubbly dopamine chime: E5 (659.25), A5 (880.00), E6 (1318.51)
        const notes = [659.25, 880.00, 1318.51];
        const times = [0, 0.08, 0.16];
        
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + times[index]);
          
          gain.gain.setValueAtTime(0, now + times[index]);
          gain.gain.linearRampToValueAtTime(0.25, now + times[index] + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + times[index] + 0.8);
          
          // Connect to make a high quality ringing bell feel
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + times[index]);
          osc.stop(now + times[index] + 0.9);
        });
        break;
      }

      case 'dispatched': {
        // Optimistic rising sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(349.23, now); // F4
        // Sweeps exponentially upwards to C6 (1046.50) over 0.5s - signifies high speed transit
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.5);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.65);
        break;
      }

      case 'delivered': {
        // Celebratory rich chord: C5 (523.25), G5 (783.99), C6 (1046.50), E6 (1318.51)
        // Played together with slightly staggered start times
        const notes = [523.25, 783.99, 1046.50, 1318.51];
        
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = index === 3 ? 'sine' : 'triangle'; // Mix waves for richer harmony
          osc.frequency.setValueAtTime(freq, now + index * 0.05);
          
          gain.gain.setValueAtTime(0, now + index * 0.05);
          gain.gain.linearRampToValueAtTime(0.15, now + index * 0.05 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 1.2);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + index * 0.05);
          osc.stop(now + index * 0.05 + 1.5);
        });
        break;
      }

      case 'cancelled': {
        // Soft low-register descent: G3 (196.00) -> E3 (164.81)
        const notes = [196.00, 164.81];
        const times = [0, 0.2];
        
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + times[index]);
          
          gain.gain.setValueAtTime(0, now + times[index]);
          gain.gain.linearRampToValueAtTime(0.15, now + times[index] + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + times[index] + 0.6);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + times[index]);
          osc.stop(now + times[index] + 0.7);
        });
        break;
      }

      case 'alert':
      default: {
        // Standard high-quality pop/bubble sound: 600Hz decaying rapidly to 150Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }
    }
  }
}

export const audioHelper = new AudioHelper();
