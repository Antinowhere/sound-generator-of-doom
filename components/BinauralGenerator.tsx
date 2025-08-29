'use client'

import { useState, useEffect, useRef } from 'react'
import { useAudioEngine } from '@/hooks/useAudioEngine'

interface BinauralGeneratorProps {
  onEmotionChange: (emotion: string) => void
}

export default function BinauralGenerator({ onEmotionChange }: BinauralGeneratorProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [baseFreq, setBaseFreq] = useState(200)
  const [beatFreq, setBeatFreq] = useState(10)
  const [noiseMix, setNoiseMix] = useState(0)
  const [panValue, setPanValue] = useState(0)
  const [waveform, setWaveform] = useState<OscillatorType>('sine')
  const [currentEmotion, setCurrentEmotion] = useState('calm')
  const { startBinaural, stopBinaural, updateBinauralFrequencies, updateNoiseMix, updatePanning, updateWaveform, analyser } = useAudioEngine()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (isPlaying) {
      updateBinauralFrequencies(baseFreq, beatFreq)
      updateNoiseMix(noiseMix / 100)
      updatePanning(panValue / 100)
      updateWaveform(waveform)
    }
  }, [baseFreq, beatFreq, noiseMix, panValue, waveform, isPlaying])

  useEffect(() => {
    onEmotionChange(currentEmotion)
  }, [currentEmotion, onEmotionChange])

  useEffect(() => {
    if (!analyser || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw)
      
      analyser.getByteTimeDomainData(dataArray)
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.lineWidth = getWaveThickness(waveform)
      ctx.strokeStyle = getWaveColor(currentEmotion)
      ctx.beginPath()
      
      const sliceWidth = canvas.width / bufferLength
      let x = 0
      
      // Add waveform-specific rendering effects
      if (waveform === 'sawtooth' || waveform === 'square') {
        ctx.shadowBlur = 2
        ctx.shadowColor = getWaveColor(currentEmotion)
      } else {
        ctx.shadowBlur = 0
      }
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        let y = v * canvas.height / 2
        
        // Add slight waveform-specific visual modifications
        if (waveform === 'square') {
          y = Math.sign(y - canvas.height / 2) * Math.abs(y - canvas.height / 2) + canvas.height / 2
        } else if (waveform === 'triangle') {
          y = canvas.height / 2 + Math.abs(y - canvas.height / 2) * Math.sign(Math.sin(i * 0.1))
        }
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        
        x += sliceWidth
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [analyser, isPlaying, currentEmotion])

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopBinaural()
      setIsPlaying(false)
    } else {
      startBinaural(baseFreq, beatFreq, noiseMix / 100, panValue / 100, waveform)
      setIsPlaying(true)
    }
  }

  const emotionPresets = [
    { name: 'Calm', id: 'calm', baseFreq: 200, beatFreq: 4, noiseMix: 30, description: 'Theta waves for deep relaxation' },
    { name: 'Focus', id: 'focus', baseFreq: 400, beatFreq: 14, noiseMix: 10, description: 'Beta waves for concentration' },
    { name: 'Energized', id: 'energized', baseFreq: 600, beatFreq: 30, noiseMix: 5, description: 'Gamma waves for high energy' },
    { name: 'Anxiety', id: 'anxiety', baseFreq: 800, beatFreq: 40, noiseMix: 60, description: 'High frequency stimulation' },
    { name: 'Meditative', id: 'meditative', baseFreq: 150, beatFreq: 7, noiseMix: 20, description: 'Alpha waves for meditation' },
  ]

  const applyEmotionPreset = (preset: typeof emotionPresets[0]) => {
    setBaseFreq(preset.baseFreq)
    setBeatFreq(preset.beatFreq)
    setNoiseMix(preset.noiseMix)
    setCurrentEmotion(preset.id)
  }

  function getWaveColor(emotion: string) {
    switch(emotion) {
      case 'calm': return 'rgba(147, 197, 253, 0.8)'
      case 'focus': return 'rgba(134, 239, 172, 0.8)'
      case 'energized': return 'rgba(252, 165, 165, 0.8)'
      case 'anxiety': return 'rgba(248, 113, 113, 0.8)'
      case 'meditative': return 'rgba(196, 181, 253, 0.8)'
      default: return 'rgba(255, 255, 255, 0.8)'
    }
  }

  function getWaveThickness(waveform: OscillatorType) {
    switch(waveform) {
      case 'sine': return 2
      case 'square': return 3
      case 'sawtooth': return 2.5
      case 'triangle': return 2.5
      default: return 2
    }
  }

  return (
    <div className="bg-black/30 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl border border-white/10">
      <div className="space-y-4 sm:space-y-6">
        {/* Emotion Presets */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium">Emotion Presets</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {emotionPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyEmotionPreset(preset)}
                className={`
                  p-2 sm:p-3 rounded-lg font-medium text-xs sm:text-sm transition-all
                  ${currentEmotion === preset.id 
                    ? 'bg-white text-black shadow-lg scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }
                `}
              >
                <div>{preset.name}</div>
                <div className="text-xs opacity-60 mt-1">{preset.beatFreq}Hz</div>
              </button>
            ))}
          </div>
          <p className="text-white/60 text-xs mt-2">
            {emotionPresets.find(p => p.id === currentEmotion)?.description}
          </p>
        </div>

        {/* Play/Stop Button */}
        <button
          onClick={handleTogglePlay}
          className={`
            w-full px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all
            ${isPlaying 
              ? 'bg-white text-black hover:bg-gray-200' 
              : 'bg-white/10 text-white border-2 border-white hover:bg-white/20'
            }
          `}
        >
          {isPlaying ? 'STOP' : 'PLAY'}
        </button>

                {/* Controls */}
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-2">
              Base Frequency: {baseFreq} Hz
            </label>
            <input
              type="range"
              min="100"
              max="1000"
              value={baseFreq}
              onChange={(e) => setBaseFreq(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-2">
              Beat Frequency: {beatFreq} Hz
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={beatFreq}
              onChange={(e) => setBeatFreq(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-2">
              Waveform: {waveform.charAt(0).toUpperCase() + waveform.slice(1)}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map((wave) => (
                <button
                  key={wave}
                  onClick={() => setWaveform(wave)}
                  className={`
                    p-2 rounded-lg text-xs sm:text-sm font-medium transition-all
                    ${waveform === wave 
                      ? 'bg-white text-black' 
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                    }
                  `}
                >
                  {wave.charAt(0).toUpperCase() + wave.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-2">
              Noise vs Tone Mix: {noiseMix}% noise / {100 - noiseMix}% tone
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={noiseMix}
              onChange={(e) => setNoiseMix(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>Pure Tone</span>
              <span>Pure Noise</span>
            </div>
          </div>

          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-2">
              L/R Panning: {panValue > 0 ? `${panValue}% Right` : panValue < 0 ? `${Math.abs(panValue)}% Left` : 'Center'}
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={panValue}
              onChange={(e) => setPanValue(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>Left</span>
              <span>Center</span>
              <span>Right</span>
            </div>
          </div>
        </div>
        
        {/* Waveform Visualization */}
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full h-32 sm:h-40 bg-black/50 rounded-lg border border-white/10"
        />

        {/* Main Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Beat Sequencer */}
          <BeatSequencer />

          {/* Chord Player */}
          <ChordPlayer />
        </div>

        {/* Doom Button */}
        <DoomButton />
      </div>
    </div>
  )
}

// Chord Player Component
function ChordPlayer() {
  const [selectedChord, setSelectedChord] = useState<string | null>(null)
  const [octave, setOctave] = useState(4)
  const [chordVolume, setChordVolume] = useState(50)
  const { playChord, stopChord } = useAudioEngine()

  const chords = [
    { name: 'C', notes: [0, 4, 7] },
    { name: 'Dm', notes: [2, 5, 9] },
    { name: 'Em', notes: [4, 7, 11] },
    { name: 'F', notes: [5, 9, 0] },
    { name: 'G', notes: [7, 11, 2] },
    { name: 'Am', notes: [9, 0, 4] },
    { name: 'Bdim', notes: [11, 2, 5] },
  ]

  const handleChordPress = (chord: { name: string, notes: number[] }) => {
    setSelectedChord(chord.name)
    playChord(chord.notes, octave, chordVolume / 100)
  }

  const handleChordRelease = () => {
    setSelectedChord(null)
    stopChord()
  }

  return (
    <div className="bg-white/5 p-4 rounded-lg">
      <h3 className="text-white text-sm font-medium mb-3">CHORDS</h3>
      
      {/* Controls */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-white text-xs mb-1">Octave: {octave}</label>
          <input
            type="range"
            min="2"
            max="6"
            value={octave}
            onChange={(e) => setOctave(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded slider"
          />
        </div>
        <div>
          <label className="block text-white text-xs mb-1">Volume: {chordVolume}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={chordVolume}
            onChange={(e) => setChordVolume(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded slider"
          />
        </div>
      </div>

      {/* Chord Buttons */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-2">
        {chords.map((chord) => (
          <button
            key={chord.name}
            onMouseDown={() => handleChordPress(chord)}
            onMouseUp={handleChordRelease}
            onMouseLeave={handleChordRelease}
            onTouchStart={() => handleChordPress(chord)}
            onTouchEnd={handleChordRelease}
            className={`
              p-2 rounded text-xs font-medium transition-all touch-manipulation
              ${selectedChord === chord.name 
                ? 'bg-white text-black scale-95' 
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }
            `}
          >
            {chord.name}
          </button>
        ))}
      </div>

      <p className="text-white/60 text-xs mt-3">
        Hold chord buttons to play. Works with binaural waves.
      </p>
    </div>
  )
}

// Beat Sequencer Component
function BeatSequencer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [currentStep, setCurrentStep] = useState(0)
  const [pattern, setPattern] = useState([
    [true, false, false, false, true, false, false, false], // Kick
    [false, false, true, false, false, false, true, false], // Snare
    [true, true, true, true, true, true, true, true], // Hi-hat
  ])
  const { playDrumSound } = useAudioEngine()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          const nextStep = (prev + 1) % 8
          // Play sounds for active steps
          pattern.forEach((track, trackIndex) => {
            if (track[nextStep]) {
              playDrumSound(['kick', 'snare', 'hihat'][trackIndex])
            }
          })
          return nextStep
        })
      }, (60 / bpm / 2) * 1000) // 16th notes
    }
    return () => clearInterval(interval)
  }, [isPlaying, bpm, pattern, playDrumSound])

  const toggleStep = (track: number, step: number) => {
    const newPattern = [...pattern]
    newPattern[track][step] = !newPattern[track][step]
    setPattern(newPattern)
  }

  const trackNames = ['K', 'S', 'H']

  return (
    <div className="bg-white/5 p-4 rounded-lg">
      <h3 className="text-white text-sm font-medium mb-3">BEATS</h3>
      
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`
            px-3 py-1 rounded text-xs font-medium transition-all
            ${isPlaying ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}
          `}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="flex-1">
          <label className="block text-white text-xs mb-1">BPM: {bpm}</label>
          <input
            type="range"
            min="60"
            max="200"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded slider"
          />
        </div>
      </div>

      <div className="space-y-1">
        {pattern.map((track, trackIndex) => (
          <div key={trackIndex} className="flex items-center gap-1">
            <span className="text-white text-xs w-4">{trackNames[trackIndex]}</span>
            {track.map((active, stepIndex) => (
              <button
                key={stepIndex}
                onClick={() => toggleStep(trackIndex, stepIndex)}
                className={`
                  w-6 h-6 rounded text-xs transition-all
                  ${active 
                    ? 'bg-white text-black' 
                    : 'bg-white/10 border border-white/20 hover:bg-white/20'
                  }
                  ${currentStep === stepIndex && isPlaying ? 'ring-2 ring-yellow-400' : ''}
                `}
              >
                {stepIndex + 1}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Doom Button Component
function DoomButton() {
  const [showPopup, setShowPopup] = useState(false)

  const handleDoomClick = () => {
    setShowPopup(true)
    setTimeout(() => setShowPopup(false), 3000)
  }

  return (
    <div className="relative flex justify-center">
      <button
        onClick={handleDoomClick}
        className="
          px-8 py-3 bg-red-900 hover:bg-red-800 text-white font-bold text-lg
          rounded-lg border-2 border-red-700 transition-all duration-200
          hover:scale-105 hover:shadow-lg hover:shadow-red-900/50
          active:scale-95 animate-pulse
        "
      >
        DOOM
      </button>

      {showPopup && (
        <div className="
          absolute -top-20 left-1/2 transform -translate-x-1/2
          bg-black border-2 border-red-500 rounded-lg p-4 text-center
          animate-bounce shadow-lg shadow-red-500/50 z-50
        ">
          <p className="text-white text-sm font-medium">
            Sorry, doom not found.
          </p>
          <p className="text-red-400 text-xs mt-1">
            I think you're past the dip
          </p>
        </div>
      )}
    </div>
  )
}