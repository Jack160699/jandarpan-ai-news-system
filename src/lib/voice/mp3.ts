/**
 * Minimal MPEG audio (MP3) frame walker — exact duration and corruption detection without
 * any native dependency. Handles ID3v2 tags, MPEG-1/2/2.5 Layer III and VBR (frame-by-frame).
 */

export type Mp3Info = {
  /** Total duration in milliseconds, summed over parsed frames. */
  durationMs: number;
  frames: number;
  sampleRate: number;
  /** Bytes that belong to valid frames / total bytes (1 = clean, low = corrupted or junk). */
  validRatio: number;
  hasId3: boolean;
};

const BITRATES: Record<string, number[]> = {
  // [version][layer] -> kbps table (index 0 = free, 15 = bad)
  "1-3": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  "2-3": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG-1
  2: [22050, 24000, 16000], // MPEG-2
  0: [11025, 12000, 8000], // MPEG-2.5
};

export function parseMp3(bytes: Uint8Array): Mp3Info | null {
  let i = 0;
  let hasId3 = false;
  if (bytes.length > 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size = ((bytes[6]! & 0x7f) << 21) | ((bytes[7]! & 0x7f) << 14) | ((bytes[8]! & 0x7f) << 7) | (bytes[9]! & 0x7f);
    i = 10 + size;
    hasId3 = true;
  }

  let durationMs = 0;
  let frames = 0;
  let validBytes = 0;
  let sampleRate = 0;
  let resyncs = 0;

  while (i + 4 <= bytes.length) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1]!;
    if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) {
      i++;
      resyncs++;
      continue;
    }
    const versionBits = (b1 >> 3) & 0x03; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5, 1=reserved
    const layerBits = (b1 >> 1) & 0x03; // 1=Layer III
    if (versionBits === 1 || layerBits !== 1) {
      i++;
      resyncs++;
      continue;
    }
    const b2 = bytes[i + 2]!;
    const bitrateIdx = (b2 >> 4) & 0x0f;
    const srIdx = (b2 >> 2) & 0x03;
    const padding = (b2 >> 1) & 0x01;
    if (bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) {
      i++;
      resyncs++;
      continue;
    }
    const kbps = BITRATES[versionBits === 3 ? "1-3" : "2-3"]![bitrateIdx]!;
    const sr = SAMPLE_RATES[versionBits]![srIdx]!;
    const samplesPerFrame = versionBits === 3 ? 1152 : 576;
    const frameLen = Math.floor(((versionBits === 3 ? 144 : 72) * kbps * 1000) / sr) + padding;
    if (frameLen < 24 || i + frameLen > bytes.length + 1) {
      // truncated last frame: count what remains as invalid and stop
      break;
    }
    frames++;
    validBytes += frameLen;
    sampleRate = sr;
    durationMs += (samplesPerFrame / sr) * 1000;
    i += frameLen;
  }
  void resyncs;

  if (frames === 0) return null;
  const payload = Math.max(1, bytes.length - (hasId3 ? Math.min(bytes.length, 10) : 0));
  return {
    durationMs: Math.round(durationMs),
    frames,
    sampleRate,
    validRatio: Math.min(1, validBytes / payload),
    hasId3,
  };
}

/** Build a syntactically valid silent MP3 of ~`seconds` (test/fixture helper). */
export function buildSilentMp3(seconds: number, opts: { kbps?: number; sampleRate?: number } = {}): Uint8Array {
  const kbps = opts.kbps ?? 32;
  const sr = opts.sampleRate ?? 24000; // MPEG-2, 576 samples/frame
  const bitrateIdx = BITRATES["2-3"]!.indexOf(kbps);
  const srIdx = SAMPLE_RATES[2]!.indexOf(sr);
  if (bitrateIdx < 1 || srIdx < 0) throw new Error("unsupported bitrate/sample rate for fixture");
  const frameLen = Math.floor((72 * kbps * 1000) / sr);
  const frameCount = Math.ceil((seconds * sr) / 576);
  const out = new Uint8Array(frameLen * frameCount);
  for (let f = 0; f < frameCount; f++) {
    const o = f * frameLen;
    out[o] = 0xff;
    out[o + 1] = 0xf3; // MPEG-2, Layer III, no CRC
    out[o + 2] = (bitrateIdx << 4) | (srIdx << 2);
    out[o + 3] = 0xc4; // mono
  }
  return out;
}
