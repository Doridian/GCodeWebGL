'use strict';

function parseGCode(data, width) {
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
                const lastE = currentE;

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
                        currentX = cmd.X;
                    }
                    if (cmd.Y !== undefined) {
                        currentY = cmd.Y;
                    }
                    if (cmd.Z !== undefined) {
                        currentZ = cmd.Z;
                    }
                    if (cmd.E !== undefined) {
                        currentE = cmd.E;
                    }
                }

                if (currentZ !== currentLayer.z) {
                    currentLayer = new Layer(currentZ);
                    layers.push(currentLayer);
                }
                
                currentLayer.points.push(new Vector(currentX, currentY, currentE - lastE));
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
                if (cmd.E) {
                    currentE = cmd.E;
                }
                if (cmd.X || cmd.Y || cmd.Z) {
                    console.warn(`Got G92 with X or Y or Z. Cannot parse: ${cmdRaw}`);
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
