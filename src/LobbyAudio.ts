// =====================================================
// LOBBY BGM DUAL-ENGINE (Tropical Island & Royal X Theme)
// Supports:
// 1. "Lagu Tropis" (Domino Island Marimba / Ukulele / Shaker)
// 2. "Lagu Royal X" (VIP Casino Anthem Synth OR Custom MP3 File)
// Web Audio API + HTML5 Audio streaming
// =====================================================

export type BgmTrackType = 'tropical' | 'royal_x';

class LobbyAudioManager {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private isMutedState: boolean = false;
  private masterGain: GainNode | null = null;
  private timerId: number | null = null;
  private currentStep: number = 0;
  private currentTrack: BgmTrackType = 'tropical';

  // Custom Audio File support (MP3/WAV/OGG)
  private customAudio: HTMLAudioElement | null = null;
  private customAudioUrl: string | null = null;
  private customAudioName: string | null = null;
  private isCustomFileLoaded: boolean = false;

  // Frequencies for Synthesizers
  private readonly FREQS: Record<string, number> = {
    'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
    'G#4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
    'A5': 880.00, 'Bb5': 932.33, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51
  };

  constructor() {
    this.isMutedState = localStorage.getItem('set_bgm') === 'off';
    const savedTrack = localStorage.getItem('set_bgm_track');
    if (savedTrack === 'royal_x' || savedTrack ==='tropical') {
      this.currentTrack = savedTrack;
    }

    // Auto-resume audio context & audio elements on user interaction
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.customAudio && this.isRunning && !this.isMutedState) {
        this.customAudio.play().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    // Initialize custom audio from IndexedDB or static file
    this.initCustomAudioStorage();

    // Listen to settings toggle
    window.addEventListener('bgm_setting_changed', (e: any) => {
      if (e.detail?.enabled !== undefined) {
        this.setMuted(!e.detail.enabled);
      }
    });
  }

  // ==========================================
  // CUSTOM AUDIO STORAGE (IndexedDB & /audio/lagu_kita.mp3)
  // ==========================================
  private async initCustomAudioStorage() {
    // 1. Try loading from IndexedDB
    try {
      const db = await this.openDb();
      const tx = db.transaction('bgm_store', 'readonly');
      const store = tx.objectStore('bgm_store');
      const req = store.get('custom_bgm');
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          const url = URL.createObjectURL(req.result.blob);
          this.setLoadedCustomAudio(url, req.result.name || 'audio/lagu_kita.mp3');
        } else {
          // Check static folder /audio/lagu_kita.mp3
          this.checkStaticCustomFile();
        }
      };
    } catch {
      this.checkStaticCustomFile();
    }
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject('IndexedDB not supported');
      }
      const req = indexedDB.open('DominoAudioDB', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('bgm_store')) {
          db.createObjectStore('bgm_store', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private checkStaticCustomFile() {
    if (typeof window === 'undefined') return;
    fetch('/audio/lagu_kita.mp3', { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          this.setLoadedCustomAudio('/audio/lagu_kita.mp3', 'lagu_kita.mp3 (Default)');
        }
      })
      .catch(() => {});
  }

  private setLoadedCustomAudio(url: string, name: string) {
    if (this.customAudioUrl && this.customAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.customAudioUrl);
    }
    this.customAudioUrl = url;
    this.customAudioName = name;
    this.isCustomFileLoaded = true;

    if (!this.customAudio) {
      this.customAudio = new Audio();
      this.customAudio.loop = true;
      this.customAudio.preload = 'auto';
    }
    this.customAudio.src = url;
    this.customAudio.volume = this.isMutedState ? 0 : 0.35;

    // If currently running royal_x, switch smoothly to custom audio
    if (this.isRunning && this.currentTrack === 'royal_x' && !this.isMutedState) {
      this.stopSynthesizer();
      this.customAudio.play().catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('bgm_custom_file_loaded', { detail: { name } }));
  }

  public async setCustomAudioFile(file: File): Promise<string> {
    const url = URL.createObjectURL(file);
    const name = file.name;

    try {
      const db = await this.openDb();
      const tx = db.transaction('bgm_store', 'readwrite');
      const store = tx.objectStore('bgm_store');
      store.put({ id: 'custom_bgm', blob: file, name, date: Date.now() });
    } catch (e) {
      console.warn('Could not cache custom audio to IndexedDB:', e);
    }

    this.setLoadedCustomAudio(url, name);
    return name;
  }

  public async removeCustomAudioFile(): Promise<void> {
    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio.src = '';
    }
    if (this.customAudioUrl && this.customAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.customAudioUrl);
    }
    this.customAudioUrl = null;
    this.customAudioName = null;
    this.isCustomFileLoaded = false;

    try {
      const db = await this.openDb();
      const tx = db.transaction('bgm_store', 'readwrite');
      tx.objectStore('bgm_store').delete('custom_bgm');
    } catch {}

    // If on royal_x and running, resume synthesized royal_x theme
    if (this.isRunning && this.currentTrack === 'royal_x') {
      this.startSynthesizer();
    }

    window.dispatchEvent(new CustomEvent('bgm_custom_file_removed'));
  }

  public getCustomAudioName(): string | null {
    return this.customAudioName;
  }

  public isUsingCustomFile(): boolean {
    return this.isCustomFileLoaded;
  }

  // ==========================================
  // WEB AUDIO SYNTHESIZER CONTEXT
  // ==========================================
  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMutedState ? 0 : 0.16, this.ctx.currentTime);

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-18, this.ctx.currentTime);
      comp.knee.setValueAtTime(12, this.ctx.currentTime);
      comp.ratio.setValueAtTime(4, this.ctx.currentTime);
      comp.attack.setValueAtTime(0.005, this.ctx.currentTime);
      comp.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.masterGain.connect(comp);
      comp.connect(this.ctx.destination);
    }
  }

  // ==========================================
  // INSTRUMENTS: TRACK 1 - TROPICAL ISLAND
  // ==========================================
  private playMarimba(freq: number, time: number, duration: number = 0.28, velocity: number = 0.7) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.02, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, time);
    filter.frequency.exponentialRampToValueAtTime(700, time + duration);

    gainNode.gain.setValueAtTime(0.001, time);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.45, time + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  }

  private playBass(freq: number, time: number, duration: number = 0.35) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq / 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, time);

    gainNode.gain.setValueAtTime(0.001, time);
    gainNode.gain.linearRampToValueAtTime(0.55, time + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private playStrum(chordFreqs: number[], time: number) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    chordFreqs.forEach((freq, idx) => {
      const strumOffset = idx * 0.012;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + strumOffset);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, time + strumOffset);
      filter.Q.setValueAtTime(1.2, time + strumOffset);

      gain.gain.setValueAtTime(0.001, time + strumOffset);
      gain.gain.linearRampToValueAtTime(0.18, time + strumOffset + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + strumOffset + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(time + strumOffset);
      osc.stop(time + strumOffset + 0.2);
    });
  }

  private playShaker(time: number, isAccent: boolean = false) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isAccent ? 0.08 : 0.035, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  // ==========================================
  // INSTRUMENTS: TRACK 2 - ROYAL X CASINO VIP THEME
  // ==========================================
  // Punchy Electronic Kick
  private playKick(time: number) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);

    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  // Snappy Electro Clap / Snare
  private playClap(time: number) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.setValueAtTime(1.5, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  // Crisp Hi-Hat (Open or Closed)
  private playHiHat(time: number, isOpen: boolean = false) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    const dur = isOpen ? 0.12 : 0.035;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isOpen ? 0.09 : 0.045, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  // Rolling Royal Synth Bass
  private playSynthBass(freq: number, time: number, duration: number = 0.14) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq / 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + duration);
    filter.Q.setValueAtTime(3.5, time);

    gain.gain.setValueAtTime(0.32, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  // Royal Brass & Pad Chords (Majestic Casino Vibe)
  private playRoyalBrass(chordFreqs: number[], time: number, duration: number = 0.22) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, time);
      filter.frequency.exponentialRampToValueAtTime(900, time + duration);
      filter.Q.setValueAtTime(2, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.075, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(time);
      osc.stop(time + duration + 0.05);
    });
  }

  // Royal Fanfare Lead (Golden Casino Hook)
  private playRoyalLead(freq: number, time: number, duration: number = 0.24) {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, time);
    filter.frequency.exponentialRampToValueAtTime(1200, time + duration);
    filter.Q.setValueAtTime(2.5, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  // ==========================================
  // STEP SEQUENCER CLOCK
  // ==========================================
  private stepClock() {
    if (!this.ctx || !this.isRunning) return;

    if (this.currentTrack === 'tropical') {
      this.stepClockTropical();
    } else {
      // If custom audio file is loaded and running, don't run synth
      if (this.isCustomFileLoaded) {
        return;
      }
      this.stepClockRoyalX();
    }
  }

  // --- Track 1 Sequencer: Tropical (106 BPM) ---
  private stepClockTropical() {
    const now = this.ctx!.currentTime;
    const step = this.currentStep % 32;
    const beat = Math.floor(step / 4);
    const sub = step % 4;

    let chordNotes = [this.FREQS['G4'], this.FREQS['B4'], this.FREQS['D5']];
    let bassRoot = this.FREQS['G3'];
    let bassFifth = this.FREQS['D3'];

    if (beat >= 2 && beat < 4) {
      chordNotes = [this.FREQS['E4'], this.FREQS['G4'], this.FREQS['B4']];
      bassRoot = this.FREQS['E3'];
      bassFifth = this.FREQS['B2'];
    } else if (beat >= 4 && beat < 6) {
      chordNotes = [this.FREQS['C4'], this.FREQS['E4'], this.FREQS['G4']];
      bassRoot = this.FREQS['C4'];
      bassFifth = this.FREQS['G3'];
    } else if (beat >= 6) {
      chordNotes = [this.FREQS['D4'], this.FREQS['F#4'], this.FREQS['A4']];
      bassRoot = this.FREQS['D4'];
      bassFifth = this.FREQS['A3'];
    }

    // Shaker on every 16th note
    this.playShaker(now, sub === 0);

    // Bass
    if (sub === 0) {
      this.playBass(beat % 2 === 0 ? bassRoot : bassFifth, now, 0.40);
    }

    // Ukulele strum on offbeats
    if (sub === 2) {
      this.playStrum(chordNotes, now);
    }

    // Marimba Melody
    const melodyMap: Record<number, number> = {
      0: this.FREQS['B4'],
      2: this.FREQS['D5'],
      4: this.FREQS['G5'],
      6: this.FREQS['E5'],
      8: this.FREQS['D5'],
      10: this.FREQS['B4'],
      12: this.FREQS['A4'],
      14: this.FREQS['B4'],
      16: this.FREQS['C5'],
      18: this.FREQS['E5'],
      20: this.FREQS['G5'],
      22: this.FREQS['E5'],
      24: this.FREQS['F#4'],
      26: this.FREQS['A4'],
      28: this.FREQS['D5'],
      30: this.FREQS['C5'],
    };

    if (melodyMap[step]) {
      this.playMarimba(melodyMap[step], now, 0.28, 0.65);
    }

    this.currentStep = (this.currentStep + 1) % 32;
    const stepDurationMs = (60 / 106 / 4) * 1000;
    this.timerId = window.setTimeout(() => this.stepClock(), stepDurationMs);
  }

  // --- Track 2 Sequencer: Royal X Anthem (124 BPM) ---
  private stepClockRoyalX() {
    const now = this.ctx!.currentTime;
    const step = this.currentStep % 32;
    const beat = Math.floor(step / 4);
    const sub = step % 4;

    // Progression:
    // Bar 1 (steps 0..7): D minor (D4, F4, A4)
    // Bar 2 (steps 8..15): Bb Major (Bb3, D4, F4)
    // Bar 3 (steps 16..23): C Major (C4, E4, G4)
    // Bar 4 (steps 24..31): A Major (A3, C#4, E4)
    let chordNotes = [this.FREQS['D4'], this.FREQS['F4'], this.FREQS['A4']];
    let bassNote = this.FREQS['D3'];

    if (beat >= 2 && beat < 4) {
      chordNotes = [this.FREQS['Bb3'], this.FREQS['D4'], this.FREQS['F4']];
      bassNote = this.FREQS['Bb2'];
    } else if (beat >= 4 && beat < 6) {
      chordNotes = [this.FREQS['C4'], this.FREQS['E4'], this.FREQS['G4']];
      bassNote = this.FREQS['C3'];
    } else if (beat >= 6) {
      chordNotes = [this.FREQS['A3'], this.FREQS['C#4'], this.FREQS['E4']];
      bassNote = this.FREQS['A2'];
    }

    // 1. Kick on four-on-the-floor
    if (sub === 0) {
      this.playKick(now);
    }

    // 2. Clap / Snare on 2 and 4 (beat 1 and 3 of each 2-beat measure)
    if (sub === 0 && (beat % 2 === 1)) {
      this.playClap(now);
    }

    // 3. Hi-hat: closed on 16ths, open on offbeats (sub 2)
    if (sub === 2) {
      this.playHiHat(now, true);
    } else {
      this.playHiHat(now, false);
    }

    // 4. Rolling 16th-note Synth Bass
    this.playSynthBass(bassNote, now, 0.12);

    // 5. Royal Brass Chords on syncopated accents (sub 0, sub 3)
    if (sub === 0 || sub === 3) {
      this.playRoyalBrass(chordNotes, now, 0.20);
    }

    // 6. Royal X Fanfare Lead Melody
    const royalMelody: Record<number, number> = {
      0: this.FREQS['D5'],
      2: this.FREQS['F5'],
      4: this.FREQS['A5'],
      6: this.FREQS['G5'],
      8: this.FREQS['F5'],
      10: this.FREQS['D5'],
      12: this.FREQS['E5'],
      14: this.FREQS['F5'],
      16: this.FREQS['G5'],
      18: this.FREQS['A5'],
      20: this.FREQS['C6'],
      22: this.FREQS['A5'],
      24: this.FREQS['E5'],
      26: this.FREQS['F5'],
      28: this.FREQS['D5'],
      30: this.FREQS['C5'],
    };

    if (royalMelody[step]) {
      this.playRoyalLead(royalMelody[step], now, 0.24);
    }

    this.currentStep = (this.currentStep + 1) % 32;
    const stepDurationMs = (60 / 124 / 4) * 1000;
    this.timerId = window.setTimeout(() => this.stepClock(), stepDurationMs);
  }

  // ==========================================
  // PLAYBACK CONTROLS
  // ==========================================
  private startSynthesizer() {
    this.initContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
    this.stepClock();
  }

  private stopSynthesizer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.initContext();

    // Master fade-in
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0.001, now);
      if (!this.isMutedState) {
        this.masterGain.gain.linearRampToValueAtTime(0.16, now + 1.2);
      }
    }

    if (this.currentTrack === 'royal_x' && this.isCustomFileLoaded && this.customAudio) {
      this.customAudio.volume = this.isMutedState ? 0 : 0.35;
      this.customAudio.play().catch(() => {});
    } else {
      this.startSynthesizer();
    }
  }

  public stop() {
    if (!this.isRunning) return;

    if (this.customAudio) {
      this.customAudio.pause();
    }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      setTimeout(() => {
        this.stopSynthesizer();
        this.isRunning = false;
      }, 400);
    } else {
      this.stopSynthesizer();
      this.isRunning = false;
    }
  }

  public setTrack(track: BgmTrackType) {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    localStorage.setItem('set_bgm_track', track);

    // If currently running, crossfade or switch smoothly
    if (this.isRunning) {
      this.stopSynthesizer();
      if (this.customAudio) {
        this.customAudio.pause();
      }

      if (track === 'royal_x' && this.isCustomFileLoaded && this.customAudio) {
        this.customAudio.volume = this.isMutedState ? 0 : 0.35;
        this.customAudio.play().catch(() => {});
      } else {
        this.startSynthesizer();
      }
    }

    window.dispatchEvent(new CustomEvent('bgm_track_changed', { detail: { track } }));
  }

  public getTrack(): BgmTrackType {
    return this.currentTrack;
  }

  public setMuted(muted: boolean) {
    this.isMutedState = muted;
    localStorage.setItem('set_bgm', muted ? 'off' : 'on');

    if (this.customAudio) {
      this.customAudio.volume = muted ? 0 : 0.35;
      if (!muted && this.isRunning && this.currentTrack === 'royal_x' && this.isCustomFileLoaded) {
        this.customAudio.play().catch(() => {});
      }
    }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      if (muted) {
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      } else {
        this.masterGain.gain.linearRampToValueAtTime(0.16, now + 0.4);
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    }
  }

  public toggleMute(): boolean {
    const nextMuted = !this.isMutedState;
    this.setMuted(nextMuted);
    return !nextMuted;
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public getIsPlaying(): boolean {
    return this.isRunning && !this.isMutedState;
  }
}

export const lobbyAudio = new LobbyAudioManager();
export default lobbyAudio;
