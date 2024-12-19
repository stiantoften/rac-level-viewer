export class EngineHeader {
  /** @param {DataView} dataView */
  constructor(dataView) {
    this.mobyModelPointer = dataView.getUint32(0x00);
    this.renderDefPointer = dataView.getUint32(0x04);
    this.type08Pointer = dataView.getUint32(0x08);
    this.type0CPointer = dataView.getUint32(0x0c);

    this.skyboxPointer = dataView.getUint32(0x10);
    this.collisionPointer = dataView.getUint32(0x14);
    this.playerAnimationPointer = dataView.getUint32(0x18);
    this.tieModelPointer = dataView.getUint32(0x1c);

    this.tieModelCount = dataView.getUint32(0x20);
    this.tiePointer = dataView.getUint32(0x24);
    this.tieCount = dataView.getUint32(0x28);
    this.shrubModelPointer = dataView.getUint32(0x2c);

    this.shrubModelCount = dataView.getUint32(0x30);
    this.shrubPointer = dataView.getUint32(0x34);
    this.shrubCount = dataView.getUint32(0x38);
    this.terrainPointer = dataView.getUint32(0x3c);

    this.type40Pointer = dataView.getUint32(0x40);
    this.type44Pointer = dataView.getUint32(0x44);
    this.soundConfigPointer = dataView.getUint32(0x48);
    this.weaponPointer = dataView.getUint32(0x4c);

    this.weaponCount = dataView.getUint32(0x50);
    this.texturePointer = dataView.getUint32(0x54);
    this.textureCount = dataView.getUint32(0x58);
    this.lightPointer = dataView.getUint32(0x5c);

    this.lightCount = dataView.getUint32(0x60);
    this.lightConfigPointer = dataView.getUint32(0x64);
    this.textureConfigMenuPointer = dataView.getUint32(0x68);
    this.textureConfigMenuCount = dataView.getUint32(0x6c);

    this.splinePointer = dataView.getUint32(0x70);
    this.unkPointer13 = dataView.getUint32(0x74);
    this.unkPointer14 = dataView.getUint32(0x78);
    this.type7CPointer = dataView.getUint32(0x7c);

    this.texture2dPointer = dataView.getUint32(0x80);
    this.uiElementPointer = dataView.getUint32(0x84);
  }
}
