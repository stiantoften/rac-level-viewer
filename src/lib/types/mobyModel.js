export class MobyModel {
  /**
   * @param {DataView} dataView
   * @param {Number} offset
   * @param {Number} id
   */
  constructor(dataView, offset, id) {
    this.id = id;
    const meshPointer = offset + dataView.getUint32(offset);
    this.scale = dataView.getFloat32(offset + 0x24);

    const textureCount = dataView.getUint32(meshPointer + 0x00);
    const texBlockPointer = offset + dataView.getUint32(meshPointer + 0x08);
    const vertexOffset = offset + dataView.getUint32(meshPointer + 0x10);
    const indexPointer = offset + dataView.getUint32(meshPointer + 0x14);
    const vertexCount = dataView.getUint16(meshPointer + 0x18);

    this.indices = [];
    this.textures = [];
    for (let i = 0; i < textureCount; i++) {
      const textureId = dataView.getInt32(texBlockPointer + i * 0x10 + 0x0);
      const faceIndex = dataView.getUint32(texBlockPointer + i * 0x10 + 0x04);
      const faceCount = dataView.getUint32(texBlockPointer + i * 0x10 + 0x08);

      for (let i = faceIndex; i < faceIndex + faceCount; i += 3) {
        this.indices.push(
          dataView.getUint16(indexPointer + i * 0x02 + 0x00, false),
          dataView.getUint16(indexPointer + i * 0x02 + 0x02, false),
          dataView.getUint16(indexPointer + i * 0x02 + 0x04, false)
        );
      }

      this.textures.push({
        id: textureId,
        offset: faceIndex,
        length: faceCount,
      });
    }

    this.vertexData = new Float32Array(vertexCount * 10);
    for (let i = 0; i < this.vertexData.length; i++) {
      this.vertexData[i] = dataView.getFloat32(vertexOffset + i * 4, false);
    }
  }
}
