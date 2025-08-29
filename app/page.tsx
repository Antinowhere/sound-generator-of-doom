'use client'

import BinauralGenerator from '@/components/BinauralGenerator'
import { useState } from 'react'

export default function Home() {
  const [currentEmotion, setCurrentEmotion] = useState('calm')
  
  return (
    <main className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 transition-all duration-3000 ${getBackgroundClass(currentEmotion)}`}>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 md:mb-12 tracking-wider mix-blend-difference text-center">
        WAVE GENERATOR OF DOOM
      </h1>
      
      <div className="w-full max-w-4xl">
        <BinauralGenerator onEmotionChange={setCurrentEmotion} />
      </div>
    </main>
  )
}

function getBackgroundClass(emotion: string) {
  switch(emotion) {
    case 'calm': return 'bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 animate-gradient-slow'
    case 'focus': return 'bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 animate-gradient-medium'
    case 'energized': return 'bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 animate-gradient-fast'
    case 'anxiety': return 'bg-gradient-to-br from-red-950 via-red-900 to-orange-900 animate-pulse-fast'
    case 'meditative': return 'bg-gradient-to-br from-purple-950 via-violet-950 to-indigo-950 animate-gradient-slow'
    default: return 'bg-black'
  }
}
