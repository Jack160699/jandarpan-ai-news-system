import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageProcessingError, processImage } from "@/lib/user-news/media-process";

const solid = (w: number, h: number) => ({ create: { width: w, height: h, channels: 3 as const, background: { r: 20, g: 90, b: 160 } } });

describe("processImage", () => {
  it("re-encodes to WebP, bounds the width, and makes a thumbnail", async () => {
    const big = await sharp(solid(3200, 1800)).jpeg().toBuffer();
    const out = await processImage(big);
    expect(out.width).toBe(3200);
    expect(out.height).toBe(1800);
    expect(out.optimized.mime).toBe("image/webp");
    expect(out.optimized.width).toBe(1920);
    expect(out.thumbnail.width).toBe(640);
    expect(out.optimized.bytes.length).toBeLessThan(big.length);
    const meta = await sharp(out.optimized.bytes).metadata();
    expect(meta.format).toBe("webp");
  });

  it("does not upscale a small image", async () => {
    const small = await sharp(solid(1000, 600)).png().toBuffer();
    const out = await processImage(small);
    expect(out.optimized.width).toBe(1000);
  });

  it("STRIPS EXIF / GPS metadata from the derivative (author privacy)", async () => {
    const withExif = await sharp(solid(1280, 720))
      .withExif({ IFD0: { Copyright: "secret-author-name" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "21/1 15/1 0/1" } })
      .jpeg()
      .toBuffer();
    const before = await sharp(withExif).metadata();
    expect(before.exif).toBeDefined();
    const out = await processImage(withExif);
    expect(out.hadMetadata).toBe(true);
    const after = await sharp(out.optimized.bytes).metadata();
    expect(after.exif).toBeUndefined();
    expect(out.optimized.bytes.includes(Buffer.from("secret-author-name"))).toBe(false);
    expect(out.thumbnail.bytes.includes(Buffer.from("secret-author-name"))).toBe(false);
  });

  it("applies EXIF orientation so a rotated phone photo reports its true landscape shape", async () => {
    // 720x1280 stored pixels + orientation 6 (rotate 90 CW) displays as 1280x720 landscape
    const portraitPixels = await sharp(solid(720, 1280)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const out = await processImage(portraitPixels);
    expect(out.width).toBe(1280);
    expect(out.height).toBe(720);
    expect(out.optimized.width).toBeGreaterThan(out.optimized.height);
  });

  it("drops trailing payload appended after the image data (polyglot attempt)", async () => {
    const png = await sharp(solid(1280, 720)).png().toBuffer();
    const poisoned = Buffer.concat([png, Buffer.from("<script>alert('x')</script>EVIL_PAYLOAD")]);
    const out = await processImage(poisoned);
    expect(out.optimized.bytes.includes(Buffer.from("EVIL_PAYLOAD"))).toBe(false);
  });

  it("rejects bytes that merely look like an image", async () => {
    const fake = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("not really a png at all")]);
    await expect(processImage(fake)).rejects.toBeInstanceOf(ImageProcessingError);
  });

  it("refuses a decompression bomb: a small file that decodes to far too many pixels", async () => {
    const bomb = await sharp({ create: { width: 9000, height: 9000, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(1_000_000); // tiny on disk
    await expect(processImage(bomb)).rejects.toMatchObject({ code: "too_many_pixels" });
  });
});
