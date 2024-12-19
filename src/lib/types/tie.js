export class Tie {
  /**
   * @param {DataView} dataView
   * @param {Number} offset
   */
  constructor(dataView, offset) {
    this.matrix = new Float32Array(16);
    this.matrix.set([
      dataView.getFloat32(offset + 0x00),
      dataView.getFloat32(offset + 0x04),
      dataView.getFloat32(offset + 0x08),
      dataView.getFloat32(offset + 0x0c),

      dataView.getFloat32(offset + 0x10),
      dataView.getFloat32(offset + 0x14),
      dataView.getFloat32(offset + 0x18),
      dataView.getFloat32(offset + 0x1c),

      dataView.getFloat32(offset + 0x20),
      dataView.getFloat32(offset + 0x24),
      dataView.getFloat32(offset + 0x28),
      dataView.getFloat32(offset + 0x2c),

      dataView.getFloat32(offset + 0x30),
      dataView.getFloat32(offset + 0x34),
      dataView.getFloat32(offset + 0x38),
      dataView.getFloat32(offset + 0x3c),
    ]);

    this.modelId = dataView.getUint16(offset + 0x52);
  }
}
