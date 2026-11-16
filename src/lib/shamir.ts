// Shamir's Secret Sharing over GF(2^8), applied byte-by-byte.
// Everything runs locally in the browser; nothing is transmitted.

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x ^= (x << 1) ^ (x & 0x80 ? 0x11b : 0) // multiply by generator 3
    x &= 0xff
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}

const mul = (a: number, b: number) =>
  a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]
const div = (a: number, b: number) =>
  a === 0 ? 0 : EXP[LOG[a] + 255 - LOG[b]]

const CHECK_LEN = 4
const PREFIX = 'moirai1'

async function checksum(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return new Uint8Array(hash).slice(0, CHECK_LEN)
}

const toHex = (b: Uint8Array) =>
  Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('')
const fromHex = (s: string) => {
  if (!/^([0-9a-f]{2})+$/i.test(s)) throw new Error('Malformed share.')
  return Uint8Array.from(s.match(/../g)!, (h) => parseInt(h, 16))
}

/** Share format: moirai1-<threshold>-<index>-<hex> */
export async function split(
  secret: string,
  n: number,
  k: number,
): Promise<string[]> {
  if (!Number.isInteger(n) || !Number.isInteger(k)) throw new Error('Invalid numbers.')
  if (k < 2) throw new Error('Threshold must be at least 2.')
  if (n < k) throw new Error('Shares cannot be fewer than the threshold.')
  if (n > 255) throw new Error('At most 255 shares are supported.')

  const body = new TextEncoder().encode(secret)
  if (body.length === 0) throw new Error('Enter a secret first.')
  const data = new Uint8Array(body.length + CHECK_LEN)
  data.set(body)
  data.set(await checksum(body), body.length)

  const outputs = Array.from({ length: n }, () => new Uint8Array(data.length))
  const coeffs = new Uint8Array(k)
  for (let i = 0; i < data.length; i++) {
    crypto.getRandomValues(coeffs)
    coeffs[0] = data[i]
    for (let s = 0; s < n; s++) {
      const x = s + 1
      let y = 0
      for (let c = k - 1; c >= 0; c--) y = mul(y, x) ^ coeffs[c] // Horner
      outputs[s][i] = y
    }
  }
  return outputs.map((o, s) => `${PREFIX}-${k}-${s + 1}-${toHex(o)}`)
}

export async function combine(shares: string[]): Promise<string> {
  const parsed = shares
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [p, k, x, hex] = s.split('-')
      if (p !== PREFIX || !k || !x || !hex) throw new Error('Unrecognised share format.')
      return { k: +k, x: +x, y: fromHex(hex) }
    })
  if (parsed.length === 0) throw new Error('Paste at least one share.')
  const { k } = parsed[0]
  const len = parsed[0].y.length
  if (parsed.some((p) => p.k !== k || p.y.length !== len))
    throw new Error('These shares belong to different secrets.')
  if (new Set(parsed.map((p) => p.x)).size !== parsed.length)
    throw new Error('Duplicate share detected.')
  if (parsed.length < k)
    throw new Error(`Need ${k} shares, only ${parsed.length} provided.`)

  const use = parsed.slice(0, k)
  const data = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    let acc = 0
    for (let a = 0; a < k; a++) {
      let num = 1
      let den = 1
      for (let b = 0; b < k; b++) {
        if (a === b) continue
        num = mul(num, use[b].x)
        den = mul(den, use[a].x ^ use[b].x)
      }
      acc ^= mul(use[a].y[i], div(num, den))
    }
    data[i] = acc
  }
  const body = data.slice(0, len - CHECK_LEN)
  const check = await checksum(body)
  if (!check.every((v, i) => v === data[len - CHECK_LEN + i]))
    throw new Error('Recovery failed: shares are corrupted or from different secrets.')
  return new TextDecoder().decode(body)
}
