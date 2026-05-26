'use client'

import { useState, useEffect } from 'react'

const QUOTES = [
  { quote: "Management is doing things right; leadership is doing the right things.", attribution: "Peter Drucker" },
  { quote: "The most important thing in communication is hearing what isn't said.", attribution: "Peter Drucker" },
  { quote: "Your output is the output of your team.", attribution: "Andy Grove" },
  { quote: "The manager asks how and when; the leader asks what and why.", attribution: "Warren Bennis" },
  { quote: "Management is, above all, a practice where art, science, and craft meet.", attribution: "Henry Mintzberg" },
  { quote: "Leadership is not about being in charge. It is about taking care of those in your charge.", attribution: "Simon Sinek" },
  { quote: "Your title makes you a manager. Your people make you a leader.", attribution: "Bill Campbell" },
  { quote: "If you give a good idea to a mediocre team, they will screw it up. If you give a mediocre idea to a brilliant team, they will either fix it or throw it away and come up with something better.", attribution: "Ed Catmull" },
  { quote: "A great workplace is stunning colleagues.", attribution: "Reed Hastings" },
  { quote: "Radical Candor is about caring personally while challenging directly.", attribution: "Kim Scott" },
  { quote: "Teamwork begins by building trust. And the only way to do that is to overcome our need for invulnerability.", attribution: "Patrick Lencioni" },
  { quote: "The best leaders amplify the intelligence around them.", attribution: "Liz Wiseman" },
  { quote: "Psychological safety is not about being nice. It's about giving candid feedback, openly admitting mistakes, and learning from each other.", attribution: "Amy Edmondson" },
  { quote: "Great managers know and value the unique abilities and even the eccentricities of their employees.", attribution: "Marcus Buckingham" },
  { quote: "A leader is one who knows the way, goes the way, and shows the way.", attribution: "John C. Maxwell" },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = 0; i < a.length - 1; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function RotatingQuote() {
  const [quotes] = useState(() => shuffle(QUOTES))
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      const fadeIn = setTimeout(() => {
        setIndex(i => (i + 1) % quotes.length)
        setVisible(true)
      }, 400)
      return () => clearTimeout(fadeIn)
    }, 10000)
    return () => clearInterval(timer)
  }, [quotes.length])

  const current = quotes[index]

  return (
    <section
      className="border-t px-6 pt-8 pb-16"
      style={{ borderColor: 'rgba(254,252,247,0.08)' }}
    >
      <div
        style={{
          maxWidth: 'var(--container-width)',
          margin: '0 auto',
          textAlign: 'center',
          transition: 'opacity 0.4s ease',
          opacity: visible ? 1 : 0,
        }}
      >
        <blockquote
          className="italic leading-snug"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
            color: 'rgba(254,252,247,0.80)',
          }}
        >
          &ldquo;{current.quote}&rdquo;
        </blockquote>
        <cite
          className="mt-4 block text-xs not-italic uppercase tracking-widest"
          style={{ color: 'rgba(254,252,247,0.35)' }}
        >
          — {current.attribution}
        </cite>
      </div>
    </section>
  )
}
