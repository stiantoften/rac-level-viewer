export class ShrubModel {
  /**
   * @param {DataView} dataView
   * @param {Number} offset
   */
  constructor(dataView, offset) {
    const vertexOffset = dataView.getUint32(offset + 0x10);
    const UVPointer = dataView.getUint32(offset + 0x14);
    const indexPointer = dataView.getUint32(offset + 0x18);
    const texturePointer = dataView.getUint32(offset + 0x1c);

    //const off_20 = readUInt32BE(offset + 0x20);
    const vertexCount = dataView.getUint32(offset + 0x24);
    const textureCount = dataView.getUint16(offset + 0x28);
    //const wiggleMode = dataView.getUint16(offset + 0x2a);
    //const off_2c = readFloat(buff,offset + 0x2c);

    this.id = dataView.getUint16(offset + 0x30);

    this.vertexData = new Float32Array(vertexCount * 6);
    for (let i = 0; i < this.vertexData.length; i++) {
      this.vertexData[i] = dataView.getFloat32(vertexOffset + i * 4);
    }

    this.uvData = new Float32Array(vertexCount * 2);
    for (let i = 0; i < this.uvData.length; i++) {
      this.uvData[i] = dataView.getFloat32(UVPointer + i * 4);
    }

    this.indices = [];
    this.textures = [];
    for (let i = 0; i < textureCount; i++) {
      const textureOffset = texturePointer + i * 0x10;

      const textureId = dataView.getInt32(textureOffset + 0x00);
      const faceIndex = dataView.getUint32(textureOffset + 0x04);
      const faceCount = dataView.getUint32(textureOffset + 0x08);

      for (let i = faceIndex; i < faceIndex + faceCount; i += 3) {
        this.indices.push(
          dataView.getUint16(indexPointer + i * 0x02 + 0x00),
          dataView.getUint16(indexPointer + i * 0x02 + 0x02),
          dataView.getUint16(indexPointer + i * 0x02 + 0x04)
        );
      }

      this.textures.push({
        id: textureId,
        offset: faceIndex,
        length: faceCount,
      });
    }
  }
}
