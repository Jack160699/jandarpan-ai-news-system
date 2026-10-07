import sharp from "sharp";

export async function img(format: "png" | "jpeg" | "webp", width: number, height: number): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } } })[format]().toBuffer());
}

export async function jpegWithGps(width: number, height: number): Promise<Uint8Array> {
  return new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } } })
      .withExif({ IFD0: { Copyright: "secret-author-name" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "21/1 15/1 0/1" } })
      .jpeg()
      .toBuffer()
  );
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const str = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));
const box = (type: string, body: number[]) => [...u32(8 + body.length), ...str(type), ...body];

/** A structurally valid MP4 (ftyp + moov{mvhd, trak{tkhd}} + mdat). `padding` makes it large so the moov can sit beyond the head read. */
export function mp4(opts: { durationMs: number; width: number; height: number; moovFirst?: boolean; padding?: number }): Uint8Array {
  const timescale = 1000;
  const mvhdBody = [0, 0, 0, 0, ...u32(0), ...u32(0), ...u32(timescale), ...u32(opts.durationMs), ...new Array(80).fill(0)];
  const tkhdBody = [0, 0, 0, 7, ...u32(0), ...u32(0), ...u32(1), ...u32(0), ...u32(opts.durationMs), ...new Array(8).fill(0), ...new Array(44).fill(0), ...u32(opts.width * 65536), ...u32(opts.height * 65536)];
  const moov = box("moov", [...box("mvhd", mvhdBody), ...box("trak", box("tkhd", tkhdBody))]);
  const ftyp = box("ftyp", [...str("isom"), ...u32(512), ...str("isomiso2")]);
  const mdat = box("mdat", new Array(opts.padding ?? 64).fill(7));
  return new Uint8Array(opts.moovFirst === false ? [...ftyp, ...mdat, ...moov] : [...ftyp, ...moov, ...mdat]);
}

export const webmAudio = () => new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new Array(200).fill(1)]);
export const textBytes = (s: string) => new TextEncoder().encode(s.padEnd(64, " "));
