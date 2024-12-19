const AS_ARRAY_OFFSET = 24;

class DecodeResult {
  /**
   * @param {number} ptr
   * @param {WebAssembly.Memory} memory
   */
  constructor(ptr, memory) {
    const [success, error, unpackSize, dataPtr] = new Uint32Array(
      memory.buffer,
      ptr,
      4
    );
    this.success = success;
    this.error = error;
    if (this.success) {
      /** @type {Number} */
      this.unpackSize = unpackSize;
      /** @type {Uint8Array} */
      this.data = new Uint8Array(
        memory.buffer,
        dataPtr + AS_ARRAY_OFFSET,
        unpackSize
      );
    }
  }
}

export class PSARC {
  HEADER_SIZE = 0x20;

  /** @param {File} file - PSARC file */
  constructor(file) {
    this.file = file;
  }

  async open() {
    /** @type {ArrayBuffer} */
    const ab = await this.file.arrayBuffer();
    this.dv = new DataView(ab, 0);

    this.memory = new WebAssembly.Memory({ initial: 160 });
    this.module = await WebAssembly.instantiateStreaming(fetch("/lzma.wasm"), {
      env: {
        memory: this.memory,
        abort: (
          /** @type {string} */ filename,
          /** @type {number} */ line,
          /** @type {number} */ column
        ) => {
          throw Error(
            `abort called at ${filename ? filename + ":" : ""}${line}:${column}`
          );
        },
      },
    });
    /** @type {{ newU8Array: Function; decode: Function; reset: Function; }} */
    // @ts-ignore
    this.lzma = this.module.instance.exports;
  }

  async close() {
    // await this.fd.close();
    // this.dv.
  }

  getHeader() {
    const td = new TextDecoder();
    const isValid = td.decode(this.dv?.buffer.slice(0, 4)) == "PSAR";

    if (!this.dv) {
      throw Error("You need to open the psarc using open() first");
    }
    if (!isValid) {
      throw Error("Invalid file magic");
    }

    /**@type {{ versionMajor: number; versionMinor: number; type: string; fileOffset: number; tocEntrySize: number; fileCount: number; blockSize: number; archiveFlags: number; blockListOffset: number; }} header*/
    const header = {
      versionMajor: this.dv.getUint16(0x04, false),
      versionMinor: this.dv.getUint16(0x06, false),
      type: td.decode(this.dv.buffer.slice(0x08, 0x0c)),
      fileOffset: this.dv.getUint32(0x0c, false),
      tocEntrySize: this.dv.getUint32(0x10, false),
      fileCount: this.dv.getUint32(0x14, false),
      blockSize: this.dv.getUint32(0x18, false),
      archiveFlags: this.dv.getUint32(0x1c, false),
      blockListOffset: 0,
    };

    header.blockListOffset =
      this.HEADER_SIZE + header.tocEntrySize * header.fileCount;

    if (header.type !== "lzma") {
      throw Error("Invalid encoding");
    }

    return header;
  }

  /**
   * @param {{ blockListBuffer?: any; entry?: any; versionMajor?: number; versionMinor?: number; type?: string; fileOffset?: number; tocEntrySize?: number; fileCount?: number; blockSize?: any; archiveFlags?: number; blockListOffset?: any; }} header
   * @param {number} num
   * @returns {Uint8Array}
   */
  getFile(header, num) {
    if (!this.dv) return new Uint8Array();

    // Get values from table of contents
    const tocOffset = this.HEADER_SIZE + num * 0x1e;

    // Offset in blockList that this file starts on
    const fileBlock = this.dv.getUint32(tocOffset + 0x10);

    // Uncompressed size and file offset are 40 bit unsigned, thus shenanigans
    const uncompressedSize =
      (this.dv.getUint32(tocOffset + 0x14) << 8) |
      this.dv.getUint8(tocOffset + 0x18);
    const fileOffset =
      (this.dv.getUint32(tocOffset + 0x19) << 8) |
      this.dv.getUint8(tocOffset + 0x1d);

    const outFile = new Uint8Array(uncompressedSize);
    let outOffset = 0;
    let blockOffset = 0;
    for (let i = 0; outOffset < uncompressedSize; i++) {
      // Get size of current block from blockList
      const blockSize = this.dv.getUint16(
        header.blockListOffset + (fileBlock + i) * 2
      );

      // Decompress current block
      outOffset += this.decompFunc({
        fileOffset: fileOffset + blockOffset,
        blockSize,
        outFile,
        outOffset,
      });

      blockOffset += blockSize;
    }

    return outFile;
  }

  /**
   * @param {{ blockSize: Number;
   * fileOffset: Number
   * outFile: Uint8Array
   * outOffset: Number
   * }} input
   * @returns {Number}
   */
  decompFunc({ blockSize, fileOffset, outFile, outOffset }) {
    let size = 0;
    if (!this.dv || !this.memory || !this.lzma) return size;

    const blockBytes = new Uint8Array(this.dv.buffer, fileOffset, blockSize);

    // All compressed chunks start with 0x5d (this is not a file magic, they just happen to do)
    if (blockBytes[0] === 0x5d) {
      const inputDataPointer = this.lzma.newU8Array(blockBytes.length);
      new Uint8Array(
        this.memory.buffer,
        inputDataPointer + AS_ARRAY_OFFSET,
        blockBytes.length
      ).set(blockBytes);
      const resultPointer = this.lzma.decode(inputDataPointer);
      const result = new DecodeResult(resultPointer, this.memory);
      outFile.set(result.data, outOffset);
      size = result.unpackSize; // Should be equal to header.blockSize (65535) for all except the last block
      this.lzma.reset();
    } else {
      console.log("here");
      outFile.set(blockBytes, outOffset);
      size = blockBytes.length;
    }

    return size;
  }
}
