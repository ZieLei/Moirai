import { useState } from 'react'
import { combine, split } from './lib/shamir'

const label = 'mb-1 block font-display text-xs uppercase tracking-[0.18em] text-aegean'
const copyBtn =
  'font-display text-[0.65rem] uppercase tracking-widest text-terracotta hover:underline cursor-pointer'

function Heading({ children }: { children: string }) {
  return (
    <h2 className="mb-5 text-center font-display text-xl font-bold tracking-widest text-aegean uppercase">
      <span className="text-gold">❖</span> {children} <span className="text-gold">❖</span>
    </h2>
  )
}

function Split() {
  const [secret, setSecret] = useState('')
  const [n, setN] = useState(5)
  const [k, setK] = useState(3)
  const [shares, setShares] = useState<string[]>([])
  const [error, setError] = useState('')

  const run = async () => {
    try {
      setError('')
      setShares(await split(secret, n, k))
    } catch (e) {
      setShares([])
      setError((e as Error).message)
    }
  }

  return (
    <section className="panel">
      <Heading>Spin the Thread</Heading>
      <label className={label}>Secret</label>
      <textarea
        className="field"
        rows={4}
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Password, message, recovery phrase…"
      />
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Total shares</label>
          <input className="field" type="number" min={2} max={255} value={n}
            onChange={(e) => setN(+e.target.value)} />
        </div>
        <div>
          <label className={label}>Needed to recover</label>
          <input className="field" type="number" min={2} max={255} value={k}
            onChange={(e) => setK(+e.target.value)} />
        </div>
      </div>
      <div className="mt-5 text-center">
        <button className="btn" onClick={run}>Divide the Secret</button>
      </div>
      {error && <p className="mt-3 text-center text-terracotta" role="alert">{error}</p>}
      {shares.length > 0 && (
        <ul className="mt-6 space-y-3">
          {shares.map((s, i) => (
            <li key={s} className="border-l-4 border-gold bg-marble p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-display text-xs tracking-widest text-aegean uppercase">
                  Share {toRoman(i + 1)}
                </span>
                <button className={copyBtn} onClick={() => navigator.clipboard.writeText(s)}>Copy</button>
              </div>
              <code className="block break-all font-mono text-xs">{s}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Recover() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    try {
      setError('')
      setResult(await combine(text.split('\n')))
    } catch (e) {
      setResult(null)
      setError((e as Error).message)
    }
  }

  return (
    <section className="panel">
      <Heading>Weave Together</Heading>
      <label className={label}>Shares (one per line)</label>
      <textarea
        className="field font-mono text-xs"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="moirai1-3-1-…"
      />
      <div className="mt-5 text-center">
        <button className="btn" onClick={run}>Reveal the Secret</button>
      </div>
      {error && <p className="mt-3 text-center text-terracotta" role="alert">{error}</p>}
      {result !== null && (
        <pre className="mt-6 whitespace-pre-wrap break-all border-l-4 border-terracotta bg-marble p-3 font-body text-lg">
          {result}
        </pre>
      )}
    </section>
  )
}

function toRoman(num: number) {
  const map: [number, string][] = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''
  for (const [v, r] of map) while (num >= v) { out += r; num -= v }
  return out
}

function Pediment() {
  return (
    <svg viewBox="0 0 400 70" className="mx-auto mb-2 w-72 text-gold" aria-hidden>
      <path d="M10 62 200 8 390 62Z" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M40 60 200 17 360 60" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="40" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M0 66h400" stroke="currentColor" strokeWidth="4" />
    </svg>
  )
}

function Column() {
  return (
    <div className="hidden w-10 flex-none lg:block" aria-hidden>
      <div className="h-3 bg-gold/70" />
      <div className="h-full min-h-[24rem] bg-[repeating-linear-gradient(90deg,#e7dcc2_0_4px,#fffdf8_4px_9px)] shadow-inner" />
      <div className="h-3 bg-gold/70" />
    </div>
  )
}

export default function App() {
  return (
    <div className="marble min-h-screen">
      <div className="meander" />
      <header className="px-4 pt-10 pb-8 text-center">
        <Pediment />
        <h1 className="font-display text-5xl font-bold tracking-[0.35em] text-aegean sm:text-6xl">
          MOIRAI
        </h1>
        <p className="mt-1 font-display text-sm tracking-[0.4em] text-gold">ΜΟΙΡΑΙ</p>
        <p className="mx-auto mt-5 max-w-2xl text-xl italic text-ink/80">
          As the three Fates spin, measure and cut the thread of life, so is your secret divided
          among the trusted. Any threshold of shares restores it; fewer reveal nothing. All
          weaving happens in your browser — nothing is sent anywhere.
        </p>
      </header>
      <main className="mx-auto flex max-w-6xl gap-6 px-4 pb-14">
        <Column />
        <div className="grid flex-1 gap-10 md:grid-cols-2">
          <Split />
          <Recover />
        </div>
        <Column />
      </main>
      <div className="meander" />
    </div>
  )
}
