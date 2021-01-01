'use strict';

function parseGCode(data, width) {
    let offsetX = 0;
    let offsetY = 0;
    let offsetZ = 0;
    let offsetE = 0;

    let positionRelative = false;

    let currentX = 0;
    let currentY = 0;
    let currentZ = 0;
    let currentE = 0;

    let currentLayer = new Layer(currentZ);
    const layers = [currentLayer];

    for (const cmdRaw of data.split('\n')) {
        const cmd = new GCode(cmdRaw);
        if (!cmd.code) {
            continue;
        }

        switch (cmd.code) {
            case 'G0': // Linear move
            case 'G1': // Linear move
                if (positionRelative) {
                    if (cmd.X !== undefined) {
                        currentX += cmd.X;
                    }
                    if (cmd.Y !== undefined) {
                        currentY += cmd.Y;
                    }
                    if (cmd.Z !== undefined) {
                        currentZ += cmd.Z;
                    }
                    if (cmd.E !== undefined) {
                        currentE += cmd.E;
                    }
                } else {
                    if (cmd.X !== undefined) {
                        currentX = cmd.X + offsetX;
                    }
                    if (cmd.Y !== undefined) {
                        currentY = cmd.Y + offsetY;
                    }
                    if (cmd.Z !== undefined) {
                        currentZ = cmd.Z + offsetZ;
                    }
                    if (cmd.E !== undefined) {
                        currentE = cmd.E + offsetE;
                    }
                }

                if (currentZ !== currentLayer.z) {
                    currentLayer = new Layer(currentZ);
                    layers.push(currentLayer);
                }
                
                currentLayer.points.push(new Vector(currentX, currentY, currentE));
                break;
            case 'G28': // Home
            case 'G29': // Autolevel                
                break;
            case 'G90': // Absolute mode
                positionRelative = false;
                break;
            case 'G91': // Relative mode
                positionRelative = true;
                break;
            case 'G92': // Set position
                if (cmd.X !== undefined) {
                    offsetX = currentX - cmd.X;
                }
                if (cmd.Y !== undefined) {
                    offsetY = currentY - cmd.Y;
                }
                if (cmd.Z !== undefined) {
                    offsetZ = currentZ - cmd.Z;
                }
                if (cmd.E !== undefined) {
                    offsetE = currentE - cmd.E;
                }
                break;
            default:
                if (cmd.code.charAt(0) === 'G') {
                    console.log(`Unknown G-type command: ${cmdRaw}`);
                }
        }
    }

    return new Model(layers, width);
}
