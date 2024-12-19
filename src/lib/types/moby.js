// 	rc1
//
// 	first		mission?				maya_id?
// 00	00000078 FFFFFFFF 00000020 0000004C
//
// 	drop					model_id	scale
// 10	00000000 00000000 0000000D 3F800000
//
// 	render_	render_
// 	distance	distance
// 20	00000040 00000040 20000000 40000000
//
// 	x			y			z			rot x
// 30	4316884D 42D2F800 4201804F 00000000
//
// 	rot y		rot z
// 40	00000000 00000000 FFFFFFFF 00000000
//
//								pvar id
// 50	00000000 01000000 00000025 00000001
//
//					red		green		blue
// 60	00000000 00000037 00000034 0000002F
//
//					cutscene?
// 70	00000000 FFFFFFFF

export class Moby {
  /**
   * @param {DataView} dataView
   * @param {Number} offset
   * @param {Number} gameNum
   */
  constructor(dataView, offset, gameNum) {
    switch (gameNum) {
      case 1:
        this.off_08 = dataView.getUint32(offset + 0x08);
        this.off_0c = dataView.getUint32(offset + 0x0c);
        this.off_14 = dataView.getUint32(offset + 0x14);
        this.off_28 = dataView.getUint32(offset + 0x28);
        this.off_2c = dataView.getFloat32(offset + 0x2c);
        this.off_48 = dataView.getInt32(offset + 0x48);
        this.off_4c = dataView.getUint32(offset + 0x4c);
        this.off_54 = dataView.getUint32(offset + 0x54);
        this.off_5c = dataView.getUint32(offset + 0x5c);
        this.off_60 = dataView.getUint32(offset + 0x60);

        this.first = dataView.getUint32(offset + 0x00);
        this.missionId = dataView.getInt32(offset + 0x04);
        this.drop = dataView.getUint32(offset + 0x10);
        this.modelId = dataView.getUint32(offset + 0x18);
        this.rend1 = dataView.getUint32(offset + 0x20);
        this.rend2 = dataView.getUint32(offset + 0x24);
        this.z2 = dataView.getFloat32(offset + 0x50);
        this.pvarIndex = dataView.getInt32(offset + 0x58);
        this.r = dataView.getUint32(offset + 0x64);
        this.g = dataView.getUint32(offset + 0x68);
        this.b = dataView.getUint32(offset + 0x6c);
        this.light = dataView.getUint32(offset + 0x70);
        this.cutscene = dataView.getInt32(offset + 0x74);

        this.x = dataView.getFloat32(offset + 0x30);
        this.y = dataView.getFloat32(offset + 0x34);
        this.z = dataView.getFloat32(offset + 0x38);

        this.rx = dataView.getFloat32(offset + 0x3c);
        this.ry = dataView.getFloat32(offset + 0x40);
        this.rz = dataView.getFloat32(offset + 0x44);

        this.scale = dataView.getFloat32(offset + 0x1c);

        break;

      case 2:
      case 3:
        this.first = dataView.getUint32(offset + 0x00); // Always 120 (0x78)
        this.missionId = dataView.getInt32(offset + 0x04);
        this.off_08 = dataView.getUint32(offset + 0x08);
        this.off_0c = dataView.getUint32(offset + 0x0c);
        this.drop = dataView.getUint32(offset + 0x14);
        this.modelId = dataView.getUint32(offset + 0x28);

        this.pvarIndex = dataView.getInt32(offset + 0x68);

        this.r = dataView.getUint32(offset + 0x74);
        this.g = dataView.getUint32(offset + 0x78);
        this.b = dataView.getUint32(offset + 0x7c);
        this.light = dataView.getUint32(offset + 0x80);
        this.cutscene = dataView.getInt32(offset + 0x84);

        this.x = dataView.getFloat32(offset + 0x40);
        this.y = dataView.getFloat32(offset + 0x44);
        this.z = dataView.getFloat32(offset + 0x48);

        this.rx = dataView.getFloat32(offset + 0x4c);
        this.ry = dataView.getFloat32(offset + 0x50);
        this.rz = dataView.getFloat32(offset + 0x54);

        this.scale = dataView.getFloat32(offset + 0x2c);
      default:
        this.scale = 1;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.rx = 0;
        this.ry = 0;
        this.rz = 0;
        this.modelId = 0;
        break;
    }
  }
}
