<script>
  import { mat4, vec3 } from "wgpu-matrix";
  import vertexWGSL from "$lib/shaders/basic.vert.wgsl?raw";
  import fragmentWGSL from "$lib/shaders/basic.frag.wgsl?raw";
  import { GameplayHeader } from "$lib/types/gameplayHeader";
  import { EngineHeader } from "$lib/types/engineHeader";
  import { createInputHandler } from "$lib/3d/input";
  import { ShrubModel } from "$lib/types/shrubModel";
  import { MobyModel } from "$lib/types/mobyModel";
  import { TieModel } from "$lib/types/tieModel";
  import { Camera } from "$lib/3d/camera";
  import { Shrub } from "$lib/types/shrub";
  import { Moby } from "$lib/types/moby";
  import { Tie } from "$lib/types/tie";
  import { PSARC } from "$lib/psarc";
  import { tick } from "svelte";

  let xyz = "0,0,0";

  let loaded = false;

  /** @type {HTMLInputElement} */
  let fileInput;

  /** @type {{ name: string; engine: number; gameplay: number; vram: number; }[]} */
  let viableLevels;

  /** @type {PSARC} */
  let psarc;

  /** @type {{ versionMajor: number | undefined; versionMinor: number | undefined; type: string | undefined; fileOffset: number | undefined; tocEntrySize: number | undefined; fileCount: number | undefined; blockSize: any; archiveFlags: number | undefined; blockListOffset: any; blockListBuffer?: any; entry?: any; }} */
  let header;

  /** @type {string?} */
  let error;

  /** @type {number} */
  let gameNumber = 1;

  const onChange = async (
    /** @type { Event & {
    currentTarget: EventTarget & HTMLInputElement;
    } } */ e
  ) => {
    if (!e.currentTarget.files) {
      console.error("No file selected");
      return;
    }

    /** @type File */
    const file = e.currentTarget.files[0];

    psarc = new PSARC(file);
    await psarc.open();
    header = psarc.getHeader();

    const tocBytes = psarc.getFile(header, 0);
    const td = new TextDecoder();
    const toc = td.decode(tocBytes);

    /** @type {{ engine: number; gameplay: number; vram: number; }[]} */
    viableLevels = [];
    {
      const fileNames = toc.split("\n");
      fileNames.unshift("."); // Add an entry to start of list to make offsets correct

      let engines = fileNames.filter((n) => n.includes("engine.ps3"));
      engines.forEach((v) => {
        const folder = v.split("/").slice(0, -1).join("/");
        if (
          fileNames.includes(`${folder}/vram.ps3`) &&
          fileNames.includes(`${folder}/gameplay_ntsc`)
        ) {
          viableLevels.push({
            name: folder,
            engine: fileNames.indexOf(`${folder}/engine.ps3`),
            gameplay: fileNames.indexOf(`${folder}/gameplay_ntsc`),
            vram: fileNames.indexOf(`${folder}/vram.ps3`),
          });
        }
      });
    }
  };

  const onLevelSelect = async (
    /** @type {{ engine: number; gameplay: number; vram: number; }} */ levelEntries
  ) => {
    loaded = true;
    await tick();

    const t1 = Date.now();

    console.log("extracting engine.ps3...");
    const engineFile = psarc.getFile(header, levelEntries.engine);
    console.log("done!");

    console.log("extracting gameplay_ntsc...");
    const gameplayFile = psarc.getFile(header, levelEntries.gameplay);
    console.log("done!");

    console.log("extracting vram.ps3...");
    const vramFile = psarc.getFile(header, levelEntries.vram);
    console.log("done!");

    const engineDv = new DataView(engineFile.buffer);
    const engineHeader = new EngineHeader(engineDv);
    const gameplayDv = new DataView(gameplayFile.buffer);
    const gameplayHeader = new GameplayHeader(gameplayDv, 1);

    const t2 = Date.now();

    const canvas = document.querySelector("canvas");
    if (!canvas) {
      error = "Could not get canvas";
      return;
    }

    /** @type GPUAdapter? */
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) {
      error =
        "Could not get adapter. WebGPU might not be supported on this platform.";
      return;
    }

    /** @type GPUDevice */
    const device = await adapter.requestDevice({
      requiredFeatures: ["texture-compression-bc"],
    });

    /** @type GPUCanvasContext? */
    const context = canvas.getContext("webgpu");
    if (!context) {
      error =
        "Could not get webgpu context. WebGPU might not be supported on this platform.";
      return;
    }

    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format: presentationFormat,
    });

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: device.createShaderModule({ code: vertexWGSL }),
        buffers: [
          {
            arrayStride: 20,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
              {
                shaderLocation: 1,
                offset: 12,
                format: "float32x2",
              },
            ],
          },
          {
            stepMode: "instance",
            arrayStride: 16 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 2,
                offset: 0,
                format: "float32x4",
              },
              {
                shaderLocation: 3,
                offset: 4 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32x4",
              },
              {
                shaderLocation: 4,
                offset: 8 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32x4",
              },
              {
                shaderLocation: 5,
                offset: 12 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32x4",
              },
            ],
          },
        ],
      },
      fragment: {
        module: device.createShaderModule({ code: fragmentWGSL }),
        targets: [{ format: presentationFormat }],
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },
    });

    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    /** @type GPURenderPassDescriptor */
    const renderPassDescriptor = {
      // @ts-ignore
      colorAttachments: [
        {
          view: undefined, // Assigned later
          clearValue: [0.5, 0.5, 0.5, 1.0],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = mat4.perspective(
      (2 * Math.PI) / 5,
      aspect,
      0.1,
      200.0
    );

    const inputHandler = createInputHandler(window, canvas);
    const initialCameraPosition = vec3.create(130, 120, 35);
    const camera = new Camera({ position: initialCameraPosition });

    const modelViewProjectionMatrix = mat4.create();

    /**@param {Number} deltaTime */
    const getModelViewProjectionMatrix = (deltaTime) => {
      const viewMatrix = camera.update(deltaTime, inputHandler());
      mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);
      const trans = mat4.getTranslation(mat4.invert(viewMatrix));
      xyz = `${Math.round(trans[0])}, ${Math.round(trans[1])}, ${Math.round(trans[2])}`;
      return modelViewProjectionMatrix;
    };

    const cameraBuffer = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Things that are updated only once per frame go here
    const frameBindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: cameraBuffer,
            offset: 0,
            size: 16 * Float32Array.BYTES_PER_ELEMENT, // mat4x4 * Float32
          },
        },
        {
          binding: 1,
          resource: device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
            addressModeU: "repeat",
            addressModeV: "repeat",
          }),
        },
      ],
    });

    const identityBuffer = device.createBuffer({
      size: 16 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(identityBuffer.getMappedRange()).set(mat4.identity(), 0);
    identityBuffer.unmap();

    /**
     * @type {{
     *  textureId: number;
     *  bindGroup: GPUBindGroup;
     * }[]}
     */
    const textureBindings = [];
    {
      const textureHeaders = [];
      for (let i = 0; i < engineHeader.textureCount; i++) {
        const offset = engineHeader.texturePointer + 0x24 * i;
        textureHeaders.push({
          vramOffset: engineDv.getUint32(offset + 0x00),
          mipmapCount: engineDv.getUint16(offset + 0x04),
          // off_06: dv.getUint16(offset + 0x06),
          // off_08: dv.getUint32(offset + 0x08),
          // off_0c: dv.getUint32(offset + 0x0c),
          // off_10: dv.getUint32(offset + 0x10),
          // off_14: dv.getUint32(offset + 0x14),
          width: engineDv.getUint16(offset + 0x18),
          height: engineDv.getUint16(offset + 0x1a),
          // off_1c: dv.getUint32(offset + 0x1c),
          // off_20: dv.getUint32(offset + 0x20),
        });
      }
      for (let i = 0; i < textureHeaders.length; i++) {
        const textureHeader = textureHeaders[i];
        const dataLength =
          (((Math.max(4, textureHeader.width) / 4) *
            Math.max(4, textureHeader.height)) /
            4) *
          16;

        const texture = device.createTexture({
          size: [textureHeader.width, textureHeader.height, 1],
          format: "bc3-rgba-unorm",
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        device.queue.writeTexture(
          { texture },
          vramFile.subarray(
            textureHeader.vramOffset,
            textureHeader.vramOffset + dataLength
          ),
          {
            bytesPerRow: (Math.max(4, textureHeader.width) / 4) * 16,
          },
          { width: textureHeader.width, height: textureHeader.height }
        );

        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(1),
          entries: [
            {
              binding: 0,
              resource: texture.createView(),
            },
          ],
        });
        textureBindings.push({ textureId: i, bindGroup });
      }
    }

    //
    // Ties
    //

    /**
     * @type {{
     * mesh: {
     *  indexBuffer: GPUBuffer;
     *  vertexBuffer: GPUBuffer;
     *  textures: {
     *    id: number;
     *    offset: number;
     *    length: number;
     *    binding: GPUBindGroup | undefined;
     *   }[];
     * };
     * positionBuffer: GPUBuffer;
     * instanceCount: Number;
     * }[]}
     */
    const ties = [];
    {
      /**
       * @type {{
       *  indexBuffer: GPUBuffer;
       *  vertexBuffer: GPUBuffer;
       *  textures: {
       *    id: number;
       *    offset: number;
       *    length: number;
       *    binding: GPUBindGroup | undefined;
       *   }[];
       * }[]
       * }
       */
      const tieMeshes = [];
      for (let i = 0; i < engineHeader.tieModelCount; i++) {
        const tieModel = new TieModel(
          engineDv,
          engineHeader.tieModelPointer + i * 0x40
        );
        const vertexBuffer = device.createBuffer({
          size: tieModel.vertexData.byteLength / 2 + tieModel.uvData.byteLength,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        const mapping = new Float32Array(vertexBuffer.getMappedRange());
        for (let i = 0; i < tieModel.vertexData.length / 6; ++i) {
          mapping.set(tieModel.vertexData.slice(i * 6, i * 6 + 3), 5 * i);
          mapping.set(tieModel.uvData.slice(i * 2, i * 2 + 2), 5 * i + 3);
        }
        vertexBuffer.unmap();

        const indexBuffer = device.createBuffer({
          size: tieModel.indices.length * Uint16Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
          mappedAtCreation: true,
        });
        new Uint16Array(indexBuffer.getMappedRange()).set(tieModel.indices);
        indexBuffer.unmap();

        tieMeshes[tieModel.id] = {
          vertexBuffer,
          indexBuffer,
          textures: tieModel.textures.map((t) => ({
            ...t,
            binding: textureBindings.find((b) => b.textureId === t.id)
              ?.bindGroup,
          })),
        };
      }

      /** @type {Object.<Number, Tie[]>} */
      const tieByModelId = {};
      for (let i = 0; i < engineHeader.tieCount; i++) {
        const tie = new Tie(engineDv, engineHeader.tiePointer + i * 0x70);

        if (!tieByModelId[tie.modelId]) tieByModelId[tie.modelId] = [];
        tieByModelId[tie.modelId].push(tie);
      }

      for (const [modelId, instances] of Object.entries(tieByModelId)) {
        const positionBuffer = device.createBuffer({
          size: instances.length * 16 * Float32Array.BYTES_PER_ELEMENT, // One mat4 per element
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        const mapping = new Float32Array(positionBuffer.getMappedRange());
        for (const [index, tie] of instances.entries()) {
          mapping.set(tie.matrix, index * 16);
        }
        positionBuffer.unmap();

        ties.push({
          mesh: tieMeshes[Number(modelId)],
          positionBuffer: positionBuffer,
          instanceCount: instances.length,
        });
      }
    }

    //
    // Shrubs
    //

    /**
     * @type {{
     * mesh: {
     *  indexBuffer: GPUBuffer;
     *  vertexBuffer: GPUBuffer;
     *  textures: {
     *    id: number;
     *    offset: number;
     *    length: number;
     *    binding: GPUBindGroup | undefined;
     *   }[];
     * };
     * positionBuffer: GPUBuffer;
     * instanceCount: Number;
     * }[]}
     */
    const shrubs = [];
    {
      /**
       * @type {{
       *  indexBuffer: GPUBuffer;
       *  vertexBuffer: GPUBuffer;
       *  textures: {
       *    id: number;
       *    offset: number;
       *    length: number;
       *    binding: GPUBindGroup | undefined;
       *   }[];
       * }[]
       * }
       */
      const shrubMeshes = [];
      for (let i = 0; i < engineHeader.shrubModelCount; i++) {
        const shrubModel = new ShrubModel(
          engineDv,
          engineHeader.shrubModelPointer + i * 0x40
        );
        const vertexBuffer = device.createBuffer({
          size:
            shrubModel.vertexData.byteLength / 2 + shrubModel.uvData.byteLength,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        const mapping = new Float32Array(vertexBuffer.getMappedRange());
        for (let i = 0; i < shrubModel.vertexData.length / 6; i++) {
          mapping.set(shrubModel.vertexData.slice(i * 6, i * 6 + 3), 5 * i);
          mapping.set(shrubModel.uvData.slice(i * 2, i * 2 + 2), 5 * i + 3);
        }
        vertexBuffer.unmap();

        const indexBuffer = device.createBuffer({
          size:
            shrubModel.indices.length * Uint16Array.BYTES_PER_ELEMENT +
            ((shrubModel.indices.length * Uint16Array.BYTES_PER_ELEMENT) % 4),
          usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
          mappedAtCreation: true,
        });
        new Uint16Array(indexBuffer.getMappedRange()).set(shrubModel.indices);
        indexBuffer.unmap();

        shrubMeshes[shrubModel.id] = {
          vertexBuffer,
          indexBuffer,
          textures: shrubModel.textures.map((t) => ({
            ...t,
            binding: textureBindings.find((b) => b.textureId === t.id)
              ?.bindGroup,
          })),
        };
      }

      /** @type {Object.<Number, Shrub[]>} */
      const shrubByModelId = {};
      for (let i = 0; i < engineHeader.shrubCount; i++) {
        const shrub = new Shrub(engineDv, engineHeader.shrubPointer + i * 0x70);

        if (!shrubByModelId[shrub.modelId]) shrubByModelId[shrub.modelId] = [];
        shrubByModelId[shrub.modelId].push(shrub);
      }

      for (const [modelId, instances] of Object.entries(shrubByModelId)) {
        const positionBuffer = device.createBuffer({
          size: instances.length * 16 * Float32Array.BYTES_PER_ELEMENT, // One mat4 per element
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });

        const mapping = new Float32Array(positionBuffer.getMappedRange());
        for (const [index, shrub] of instances.entries()) {
          mapping.set(shrub.matrix, index * 16);
        }
        positionBuffer.unmap();

        shrubs.push({
          mesh: shrubMeshes[Number(modelId)],
          positionBuffer: positionBuffer,
          instanceCount: instances.length,
        });
      }
    }

    //
    // Mobies
    //

    /**
     * @type {{
     * mesh: {
     *  indexBuffer: GPUBuffer;
     *  vertexBuffer: GPUBuffer;
     *  textures: {
     *    id: number;
     *    offset: number;
     *    length: number;
     *    binding: GPUBindGroup | undefined;
     *   }[];
     * };
     * positionBuffer: GPUBuffer;
     * instanceCount: Number;
     * }[]}
     */
    const mobies = [];
    {
      /**
       * @type {{
       *  indexBuffer: GPUBuffer;
       *  vertexBuffer: GPUBuffer;
       *  scale: Number;
       *  textures: {
       *    id: number;
       *    offset: number;
       *    length: number;
       *    binding: GPUBindGroup | undefined;
       *   }[];
       * }[]
       * }
       */
      const mobyMeshes = [];
      {
        const mobyModelCount = engineDv.getUint32(
          engineHeader.mobyModelPointer
        );
        for (let i = 0; i < mobyModelCount; i++) {
          const infoOffset = engineHeader.mobyModelPointer + 4 + i * 8;
          const id = engineDv.getUint32(infoOffset);
          const offset = engineDv.getUint32(infoOffset + 4);

          if (offset == 0) continue; // Moby has no model

          const mobyModel = new MobyModel(engineDv, offset, id);

          const vertexBuffer = device.createBuffer({
            size: mobyModel.vertexData.byteLength / 2,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
          });
          const mapping = new Float32Array(vertexBuffer.getMappedRange());
          for (let i = 0; i < mobyModel.vertexData.length / 10; ++i) {
            mapping.set(mobyModel.vertexData.slice(i * 10, i * 10 + 3), 5 * i);
            mapping.set(
              mobyModel.vertexData.slice(i * 10 + 6, i * 10 + 8),
              5 * i + 3
            );
          }
          vertexBuffer.unmap();

          const indexBuffer = device.createBuffer({
            size:
              mobyModel.indices.length * 2 +
              ((mobyModel.indices.length * 2) % 4),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
          });
          new Uint16Array(indexBuffer.getMappedRange()).set(mobyModel.indices);
          indexBuffer.unmap();

          mobyMeshes[mobyModel.id] = {
            vertexBuffer,
            indexBuffer,
            textures: mobyModel.textures.map((t) => ({
              ...t,
              binding: textureBindings.find((b) => b.textureId === t.id)
                ?.bindGroup,
            })),
            scale: mobyModel.scale,
          };
        }
      }

      if (!gameplayHeader.mobyPointer) return;
      const mobyCount = gameplayDv.getUint32(gameplayHeader.mobyPointer);

      /** @type {Object.<Number, Moby[]>} */
      const mobyByModelId = {};
      for (let i = 0; i < mobyCount; i++) {
        const moby = new Moby(
          gameplayDv,
          gameplayHeader.mobyPointer +
            0x10 +
            i * (gameNumber === 1 ? 0x78 : 0x88),
          gameNumber
        );

        if (!mobyByModelId[moby.modelId]) mobyByModelId[moby.modelId] = [];
        mobyByModelId[moby.modelId].push(moby);
      }

      for (const [modelId, instances] of Object.entries(mobyByModelId)) {
        if (!mobyMeshes[Number(modelId)]) continue;
        const mesh = mobyMeshes[Number(modelId)];

        const positionBuffer = device.createBuffer({
          size: instances.length * 16 * Float32Array.BYTES_PER_ELEMENT, // One mat4 per element
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        const mapping = new Float32Array(positionBuffer.getMappedRange());
        for (const [index, moby] of instances.entries()) {
          const matrix = mat4.translation(vec3.create(moby.x, moby.y, moby.z));
          mat4.scale(
            matrix,
            vec3.create(
              moby.scale * mesh.scale,
              moby.scale * mesh.scale,
              moby.scale * mesh.scale
            ),
            matrix
          );
          mat4.rotateX(matrix, moby.rx, matrix);
          mat4.rotateY(matrix, moby.ry, matrix);
          mat4.rotateZ(matrix, moby.rz, matrix);
          mapping.set(matrix, index * 16);
        }
        positionBuffer.unmap();

        mobies.push({
          mesh,
          positionBuffer: positionBuffer,
          instanceCount: instances.length,
        });
      }
    }

    //
    // Terrain
    //

    /**
     * @type {{
     *   vertexBuffer: GPUBuffer;
     *   indexBuffer: GPUBuffer;
     *   textures: {
     *     id: number;
     *     offset: number;
     *     length: number;
     *     binding: GPUBindGroup | undefined;
     *   }[];
     * }[]}
     */
    const tfrags = [];
    {
      const headCount = engineDv.getUint16(engineHeader.terrainPointer + 0x06);

      let vertexPointers = [];
      let rgbaPointers = [];
      let UVPointers = [];
      let indexPointers = [];

      for (let i = 0; i < 4; i++) {
        const headOffset = engineHeader.terrainPointer + i * 4;
        vertexPointers.push(engineDv.getUint32(headOffset + 0x08));
        rgbaPointers.push(engineDv.getUint32(headOffset + 0x18));
        UVPointers.push(engineDv.getUint32(headOffset + 0x28));
        indexPointers.push(engineDv.getUint32(headOffset + 0x38));
      }

      for (let j = 0; j < headCount; j++) {
        const offs = engineHeader.terrainPointer + 0x60 + j * 0x30;

        const texturePointer = engineDv.getUint32(offs + 0x10);
        const textureCount = engineDv.getUint32(offs + 0x14);
        const vertexIndex = engineDv.getUint16(offs + 0x18);
        const vertexCount = engineDv.getUint16(offs + 0x1a);
        const slotNum = engineDv.getUint16(offs + 0x22);

        const vertexPointer = vertexPointers[slotNum];
        const UVPointer = UVPointers[slotNum];
        const indexPointer = indexPointers[slotNum];

        const indices = [];
        const textures = [];
        let ff = 0;

        for (let k = 0; k < textureCount; k++) {
          const textureOffset = texturePointer + k * 0x10;

          const textureId = engineDv.getInt32(textureOffset + 0x00);
          const faceIndex = engineDv.getUint32(textureOffset + 0x04);
          const faceCount = engineDv.getUint32(textureOffset + 0x08);

          for (let l = faceIndex; l < faceIndex + faceCount; l += 3) {
            indices.push(
              engineDv.getUint16(indexPointer + l * 0x02 + 0x00) - vertexIndex,
              engineDv.getUint16(indexPointer + l * 0x02 + 0x02) - vertexIndex,
              engineDv.getUint16(indexPointer + l * 0x02 + 0x04) - vertexIndex
            );
          }

          textures.push({
            id: textureId,
            offset: ff,
            length: faceCount,
          });

          ff += faceCount;
        }

        const vertexBuffer = device.createBuffer({
          size: vertexCount * 5 * Float32Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        const mapping = new Float32Array(vertexBuffer.getMappedRange());
        for (let i = 0; i < vertexCount; i++) {
          mapping.set(
            [
              engineDv.getFloat32(vertexPointer + (vertexIndex + i) * 0x1c + 0),
              engineDv.getFloat32(vertexPointer + (vertexIndex + i) * 0x1c + 4),
              engineDv.getFloat32(vertexPointer + (vertexIndex + i) * 0x1c + 8),
              engineDv.getFloat32(UVPointer + (vertexIndex + i) * 0x08 + 0),
              engineDv.getFloat32(UVPointer + (vertexIndex + i) * 0x08 + 4),
            ],
            5 * i
          );
        }
        vertexBuffer.unmap();

        const indexBuffer = device.createBuffer({
          size: indices.length * Uint16Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
          mappedAtCreation: true,
        });
        new Uint16Array(indexBuffer.getMappedRange()).set(indices);
        indexBuffer.unmap();

        tfrags.push({
          vertexBuffer,
          indexBuffer,
          textures: textures.map((t) => ({
            ...t,
            binding: textureBindings.find((b) => b.textureId === t.id)
              ?.bindGroup,
          })),
        });
      }
    }

    console.log(
      `Level loaded in ${Date.now() - t1}ms. ${t2 - t1}ms for data loading from file, ${Date.now() - t2}ms for webgpu loading`
    );

    /** @param {GPURenderBundleEncoder | GPURenderPassEncoder} passEncoder */
    const renderScene = (passEncoder) => {
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, frameBindGroup);

      for (const properTie of ties) {
        passEncoder.setVertexBuffer(0, properTie.mesh.vertexBuffer);
        passEncoder.setVertexBuffer(1, properTie.positionBuffer);

        properTie.mesh.textures.forEach((texture) => {
          if (!texture.binding) return;
          passEncoder.setBindGroup(1, texture.binding);

          passEncoder.setIndexBuffer(properTie.mesh.indexBuffer, "uint16");
          passEncoder.drawIndexed(
            texture.length,
            properTie.instanceCount,
            texture.offset
          );
        });
      }

      for (const properShrub of shrubs) {
        passEncoder.setVertexBuffer(0, properShrub.mesh.vertexBuffer);
        passEncoder.setVertexBuffer(1, properShrub.positionBuffer);

        properShrub.mesh.textures.forEach((texture) => {
          if (!texture.binding) return;
          passEncoder.setBindGroup(1, texture.binding);

          passEncoder.setIndexBuffer(properShrub.mesh.indexBuffer, "uint16");
          passEncoder.drawIndexed(
            texture.length,
            properShrub.instanceCount,
            texture.offset
          );
        });
      }

      for (const properMoby of mobies) {
        passEncoder.setVertexBuffer(0, properMoby.mesh.vertexBuffer);
        passEncoder.setVertexBuffer(1, properMoby.positionBuffer);

        properMoby.mesh.textures.forEach((texture) => {
          if (!texture.binding) return;
          passEncoder.setBindGroup(1, texture.binding);

          passEncoder.setIndexBuffer(properMoby.mesh.indexBuffer, "uint16");
          passEncoder.drawIndexed(
            texture.length,
            properMoby.instanceCount,
            texture.offset
          );
        });
      }

      // Because tfrags only draw one instance each, we just set the position matrix to identity.
      // Should probably make a separate shader for tfrags, but this works fine.
      passEncoder.setVertexBuffer(1, identityBuffer);
      for (const tfrag of tfrags) {
        passEncoder.setVertexBuffer(0, tfrag.vertexBuffer);
        tfrag.textures.forEach((texture) => {
          if (!texture.binding) return;
          passEncoder.setBindGroup(1, texture.binding);
          passEncoder.setIndexBuffer(tfrag.indexBuffer, "uint16");
          passEncoder.drawIndexed(texture.length, 1, texture.offset);
        });
      }
    };

    /** @type {GPURenderBundle} */
    let renderBundle;
    const updateRenderBundle = () => {
      const renderBundleEncoder = device.createRenderBundleEncoder({
        colorFormats: [presentationFormat],
        depthStencilFormat: "depth24plus",
      });
      renderScene(renderBundleEncoder);
      renderBundle = renderBundleEncoder.finish();
    };
    updateRenderBundle();

    let lastFrameMS = Date.now();
    const frame = () => {
      const now = Date.now();
      const deltaTime = (now - lastFrameMS) / 1000;
      lastFrameMS = now;

      const modelViewProjection = getModelViewProjectionMatrix(deltaTime);
      device.queue.writeBuffer(cameraBuffer, 0, modelViewProjection.buffer);

      // @ts-ignore
      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.executeBundles([renderBundle]);
      passEncoder.end();
      passEncoder.setViewport;
      device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
</script>

{#if error}
  <h2 class="error">{error}</h2>
{:else if loaded}
  <canvas></canvas>
  {xyz}
{:else}
  <input
    bind:this={fileInput}
    hidden
    type="file"
    accept=".psarc"
    on:change={(e) => onChange(e)}
  />
  <h1>Rachet & Clank Level Viewer</h1>
  <div class="main">
    {#if viableLevels}
      <h3>Select level</h3>
      <select bind:value={gameNumber}>
        <option value={1}>Ratchet & Clank</option>
        <option value={2}>Ratchet & Clank 2</option>
        <option value={3}>Ratchet & Clank 3</option>
      </select>
      {#each viableLevels as level}
        <button on:click={() => onLevelSelect(level)}>{level.name}</button>
      {/each}
    {:else}
      <div
        class="dropzone"
        role="button"
        tabindex="0"
        on:keydown={() => {}}
        on:click={() => fileInput.click()}
      >
        <div class="title">Click here to open PS3arc.psarc</div>
      </div>
    {/if}
  </div>
{/if}

<style>
  canvas {
    width: 1280px;
    height: 720px;
  }
  select {
    padding: 10px;
  }
  .error {
    color: red;
  }
  .dropzone {
    height: 200px;
    border: 1px dashed black;
    border-radius: 14px;
    border-width: 2px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }
  .title {
    font-size: 20px;
  }
  .main {
    margin: 0 auto;
    max-width: 800px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  button {
    border: none;
    background-color: rgb(82, 185, 71);
    border-radius: 10px;
    padding: 12px;
    font-size: 16px;
    color: #fff;
    cursor: pointer;
  }
</style>
