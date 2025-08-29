'use client'

import { useState, useEffect, useRef } from 'react'

export function useAudioEngine() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const binauralNodes = useRef<{
    leftOsc: OscillatorNode | null,
    rightOsc: OscillatorNode | null,
    leftGain: GainNode | null,
    rightGain: GainNode | null,
    noiseSource: AudioBufferSourceNode | null,
    noiseGain: GainNode | null,
    toneGain: GainNode | null,
    panNode: StereoPannerNode | null,
    merger: ChannelMergerNode | null,
    delayNode: DelayNode | null,
    delayGain: GainNode | null,
    convolverNode: ConvolverNode | null,
    reverbGain: GainNode | null
  }>({
    leftOsc: null,
    rightOsc: null,
    leftGain: null,
    rightGain: null,
    noiseSource: null,
    noiseGain: null,
    toneGain: null,
    panNode: null,
    merger: null,
    delayNode: null,
    delayGain: null,
    convolverNode: null,
    reverbGain: null
  })

  const drumBuffers = useRef<Map<string, AudioBuffer>>(new Map())
  const chordOscillators = useRef<OscillatorNode[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyserNode = ctx.createAnalyser()
      analyserNode.fftSize = 2048
      analyserNode.connect(ctx.destination)
      setAudioContext(ctx)
      setAnalyser(analyserNode)
      
      // Load drum samples
      loadDrumSamples(ctx)
    }
  }, [])

  const loadDrumSamples = async (ctx: AudioContext) => {
    // Create simple drum sounds programmatically
    const createKick = () => {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        const envelope = Math.exp(-i / (ctx.sampleRate * 0.1))
        data[i] = Math.sin(60 * 2 * Math.PI * i / ctx.sampleRate) * envelope * 0.5
      }
      return buffer
    }

    const createSnare = () => {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        const envelope = Math.exp(-i / (ctx.sampleRate * 0.05))
        const noise = (Math.random() * 2 - 1) * 0.3
        const tone = Math.sin(200 * 2 * Math.PI * i / ctx.sampleRate) * 0.2
        data[i] = (noise + tone) * envelope
      }
      return buffer
    }

    const createHihat = () => {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        const envelope = Math.exp(-i / (ctx.sampleRate * 0.02))
        data[i] = (Math.random() * 2 - 1) * envelope * 0.3
      }
      return buffer
    }

    drumBuffers.current.set('kick', createKick())
    drumBuffers.current.set('snare', createSnare())
    drumBuffers.current.set('hihat', createHihat())
  }

  const createWhiteNoise = (context: AudioContext): AudioBuffer => {
    const bufferSize = context.sampleRate * 2
    const buffer = context.createBuffer(2, bufferSize, context.sampleRate)
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel)
      for (let i = 0; i < bufferSize; i++) {
        channelData[i] = Math.random() * 2 - 1
      }
    }
    
    return buffer
  }

  const startBinaural = (baseFreq: number, beatFreq: number, noiseMix: number = 0, panValue: number = 0, waveform: OscillatorType = 'sine') => {
    if (!audioContext || !analyser) return
    
    stopBinaural()
    
    const merger = audioContext.createChannelMerger(2)
    const leftOsc = audioContext.createOscillator()
    const rightOsc = audioContext.createOscillator()
    const leftGain = audioContext.createGain()
    const rightGain = audioContext.createGain()
    const toneGain = audioContext.createGain()
    const noiseGain = audioContext.createGain()
    const panNode = audioContext.createStereoPanner()
    
    // FX nodes
    const delayNode = audioContext.createDelay(1.0)
    const delayGain = audioContext.createGain()
    const convolverNode = audioContext.createConvolver()
    const reverbGain = audioContext.createGain()
    
    // Set up oscillators
    leftOsc.type = waveform
    rightOsc.type = waveform
    leftOsc.frequency.value = baseFreq
    rightOsc.frequency.value = baseFreq + beatFreq
    
    // Set up white noise
    const noiseBuffer = createWhiteNoise(audioContext)
    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = noiseBuffer
    noiseSource.loop = true
    
    // Set gain levels based on mix
    const toneLevel = (1 - noiseMix) * 0.3
    const noiseLevel = noiseMix * 0.3
    
    leftGain.gain.value = 1
    rightGain.gain.value = 1
    toneGain.gain.value = toneLevel
    noiseGain.gain.value = noiseLevel
    panNode.pan.value = panValue
    
    // Initialize FX
    delayNode.delayTime.value = 0.3
    delayGain.gain.value = 0
    reverbGain.gain.value = 0
    
    // Connect tone path
    leftOsc.connect(leftGain)
    rightOsc.connect(rightGain)
    leftGain.connect(toneGain)
    rightGain.connect(toneGain)
    toneGain.connect(merger, 0, 0)
    toneGain.connect(merger, 0, 1)
    
    // Connect noise path
    noiseSource.connect(noiseGain)
    noiseGain.connect(merger, 0, 0)
    noiseGain.connect(merger, 0, 1)
    
    // Connect FX chain
    merger.connect(delayNode)
    delayNode.connect(delayGain)
    delayGain.connect(merger)
    
    // Connect panning and output
    merger.connect(panNode)
    panNode.connect(analyser)
    
    // Start oscillators
    leftOsc.start()
    rightOsc.start()
    noiseSource.start()
    
    binauralNodes.current = {
      leftOsc,
      rightOsc,
      leftGain,
      rightGain,
      noiseSource,
      noiseGain,
      toneGain,
      panNode,
      merger,
      delayNode,
      delayGain,
      convolverNode,
      reverbGain
    }
  }

  const stopBinaural = () => {
    const { 
      leftOsc, rightOsc, leftGain, rightGain, noiseSource, noiseGain, 
      toneGain, panNode, merger, delayNode, delayGain, convolverNode, reverbGain 
    } = binauralNodes.current
    
    if (leftOsc) {
      leftOsc.stop()
      leftOsc.disconnect()
    }
    if (rightOsc) {
      rightOsc.stop()
      rightOsc.disconnect()
    }
    if (noiseSource) {
      noiseSource.stop()
      noiseSource.disconnect()
    }
    if (leftGain) leftGain.disconnect()
    if (rightGain) rightGain.disconnect()
    if (noiseGain) noiseGain.disconnect()
    if (toneGain) toneGain.disconnect()
    if (panNode) panNode.disconnect()
    if (merger) merger.disconnect()
    if (delayNode) delayNode.disconnect()
    if (delayGain) delayGain.disconnect()
    if (convolverNode) convolverNode.disconnect()
    if (reverbGain) reverbGain.disconnect()
    
    binauralNodes.current = {
      leftOsc: null,
      rightOsc: null,
      leftGain: null,
      rightGain: null,
      noiseSource: null,
      noiseGain: null,
      toneGain: null,
      panNode: null,
      merger: null,
      delayNode: null,
      delayGain: null,
      convolverNode: null,
      reverbGain: null
    }
  }

  const updateBinauralFrequencies = (baseFreq: number, beatFreq: number) => {
    const { leftOsc, rightOsc } = binauralNodes.current
    if (leftOsc && rightOsc && audioContext) {
      leftOsc.frequency.setValueAtTime(baseFreq, audioContext.currentTime)
      rightOsc.frequency.setValueAtTime(baseFreq + beatFreq, audioContext.currentTime)
    }
  }

  const updateNoiseMix = (mix: number) => {
    const { noiseGain, toneGain } = binauralNodes.current
    if (noiseGain && toneGain && audioContext) {
      const toneLevel = (1 - mix) * 0.3
      const noiseLevel = mix * 0.3
      toneGain.gain.setValueAtTime(toneLevel, audioContext.currentTime)
      noiseGain.gain.setValueAtTime(noiseLevel, audioContext.currentTime)
    }
  }

  const updatePanning = (panValue: number) => {
    const { panNode } = binauralNodes.current
    if (panNode && audioContext) {
      panNode.pan.setValueAtTime(panValue, audioContext.currentTime)
    }
  }

  const updateWaveform = (waveform: OscillatorType) => {
    const { leftOsc, rightOsc } = binauralNodes.current
    if (leftOsc && rightOsc) {
      leftOsc.type = waveform
      rightOsc.type = waveform
    }
  }

  // Convert semitone to frequency (C4 = 261.63 Hz)
  const semitoneToFrequency = (semitone: number, octave: number) => {
    const baseFreq = 261.63 // C4
    const octaveMultiplier = Math.pow(2, octave - 4)
    return baseFreq * Math.pow(2, semitone / 12) * octaveMultiplier
  }

  const playChord = (notes: number[], octave: number, volume: number) => {
    if (!audioContext || !analyser) return
    
    // Stop any existing chord
    stopChord()
    
    const chordGain = audioContext.createGain()
    chordGain.gain.value = volume * 0.2 // Keep chords quieter than binaural waves
    chordGain.connect(analyser)
    
    notes.forEach((semitone) => {
      const osc = audioContext.createOscillator()
      const noteGain = audioContext.createGain()
      
      osc.type = 'sine' // Use sine waves for smooth harmony
      osc.frequency.value = semitoneToFrequency(semitone, octave)
      
      noteGain.gain.value = 1 / notes.length // Balance volume across notes
      
      osc.connect(noteGain)
      noteGain.connect(chordGain)
      
      osc.start()
      chordOscillators.current.push(osc)
    })
  }

  const stopChord = () => {
    chordOscillators.current.forEach((osc) => {
      try {
        osc.stop()
        osc.disconnect()
      } catch (e) {
        // Oscillator might already be stopped
      }
    })
    chordOscillators.current = []
  }

  const playDrumSound = (drumType: string) => {
    if (!audioContext || !analyser) return
    
    const buffer = drumBuffers.current.get(drumType)
    if (!buffer) return
    
    const source = audioContext.createBufferSource()
    const gain = audioContext.createGain()
    
    source.buffer = buffer
    gain.gain.value = 0.5
    
    source.connect(gain)
    gain.connect(analyser)
    source.start(0)
  }

  return {
    audioContext,
    analyser,
    startBinaural,
    stopBinaural,
    updateBinauralFrequencies,
    updateNoiseMix,
    updatePanning,
    updateWaveform,
    playDrumSound,
    playChord,
    stopChord
  }
}