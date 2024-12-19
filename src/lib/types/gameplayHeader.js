export class GameplayHeader {
  /**
   * @param {DataView} dataView
   * @param {Number} gameNumber
   */
  constructor(dataView, gameNumber) {
    switch (gameNumber) {
      case 1:
        this.levelVarPointer = dataView.getUint32(0x00);
        this.type04Pointer = dataView.getUint32(0x04);
        this.cameraPointer = dataView.getUint32(0x08);
        this.type0CPointer = dataView.getUint32(0x0c);

        this.englishPointer = dataView.getUint32(0x10);
        this.lang2Pointer = dataView.getUint32(0x14);
        this.frenchPointer = dataView.getUint32(0x18);
        this.germanPointer = dataView.getUint32(0x1c);

        this.spanishPointer = dataView.getUint32(0x20);
        this.italianPointer = dataView.getUint32(0x24);
        this.lang7Pointer = dataView.getUint32(0x28);
        this.lang8Pointer = dataView.getUint32(0x2c);

        this.tieIdPointer = dataView.getUint32(0x30);
        this.tiePointer = dataView.getUint32(0x34);
        this.shrubIdPointer = dataView.getUint32(0x38);
        this.shrubPointer = dataView.getUint32(0x3c);

        this.mobyIdPointer = dataView.getUint32(0x40);
        this.mobyPointer = dataView.getUint32(0x44);
        this.type48Pointer = dataView.getUint32(0x48);
        this.type4CPointer = dataView.getUint32(0x4c);

        this.type50Pointer = dataView.getUint32(0x50);
        this.pvarSizePointer = dataView.getUint32(0x54);
        this.pvarPointer = dataView.getUint32(0x58);
        this.type5CPointer = dataView.getUint32(0x5c);

        this.cuboidPointer = dataView.getUint32(0x60);
        this.type64Pointer = dataView.getUint32(0x64);
        this.type68Pointer = dataView.getUint32(0x68);
        this.unkPointer12 = dataView.getUint32(0x6c);

        this.splinePointer = dataView.getUint32(0x70);
        this.unkPointer13 = dataView.getUint32(0x74);
        this.unkPointer14 = dataView.getUint32(0x78);
        this.type7CPointer = dataView.getUint32(0x7c);

        this.type80Pointer = dataView.getUint32(0x80);
        this.unkPointer17 = dataView.getUint32(0x84);
        this.type88Pointer = dataView.getUint32(0x88);
        this.occlusionPointer = dataView.getUint32(0x8c);
        break;

      case 2:
      case 3:
        this.levelVarPointer = dataView.getUint32(0x00);
        this.type04Pointer = dataView.getUint32(0x04);
        this.cameraPointer = dataView.getUint32(0x08);
        this.type0CPointer = dataView.getUint32(0x0c);

        this.englishPointer = dataView.getUint32(0x10);
        this.lang2Pointer = dataView.getUint32(0x14);
        this.frenchPointer = dataView.getUint32(0x18);
        this.germanPointer = dataView.getUint32(0x1c);

        this.spanishPointer = dataView.getUint32(0x20);
        this.italianPointer = dataView.getUint32(0x24);
        this.lang7Pointer = dataView.getUint32(0x28);
        this.lang8Pointer = dataView.getUint32(0x2c);

        this.tieIdPointer = dataView.getUint32(0x30);
        // = data.readUInt32BE(0x34);
        // = data.readUInt32BE(0x38);
        this.shrubIdPointer = dataView.getUint32(0x3c);

        this.shrubPointer = dataView.getUint32(0x40);
        // = data.readUInt32BE(0x44);
        this.mobyIdPointer = dataView.getUint32(0x48);
        this.mobyPointer = dataView.getUint32(0x4c);

        this.type48Pointer = dataView.getUint32(0x50);
        this.type4CPointer = dataView.getUint32(0x54);
        this.type50Pointer = dataView.getUint32(0x58);
        this.pvarSizePointer = dataView.getUint32(0x5c);

        this.pvarPointer = dataView.getUint32(0x60);
        this.type5CPointer = dataView.getUint32(0x64);
        this.cuboidPointer = dataView.getUint32(0x68);
        this.type64Pointer = dataView.getUint32(0x6c);

        this.type68Pointer = dataView.getUint32(0x70);
        this.unkPointer12 = dataView.getUint32(0x74);
        this.splinePointer = dataView.getUint32(0x78);
        this.unkPointer13 = dataView.getUint32(0x7c);

        // = data.readUInt32BE(0x80);
        this.type80Pointer = dataView.getUint32(0x84);
        this.unkPointer17 = dataView.getUint32(0x88);
        // = data.readUInt32BE(0x8c);

        this.occlusionPointer = dataView.getUint32(0x90);
    }
  }
}
