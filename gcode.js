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
    let currentLine = [];
    let currentLineMaterial = undefined;

    const model = new Model(width);
    model.add(currentLayer);

    const pushCurrentLine = () => {
        if (currentLine.length > 1) {
            currentLayer.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(currentLine),
                currentLineMaterial,
            ));
        }

        currentLineMaterial = undefined;
        currentLine = [];
    };

    for (const cmdRaw of data.split('\n')) {
        const cmd = new GCode(cmdRaw);
        if (!cmd.code) {
            continue;
        }

        const move = new Move(cmd, (currentLayer.moves.length - 1));

        const addLinePoint = (x, y, z, e) => {
            const startX = currentX;
            const startY = currentY;
            const startZ = currentZ;
            const startE = currentE;

            if (positionRelative) {
                if (x !== undefined) {
                    currentX += x;
                }
                if (y !== undefined) {
                    currentY += y;
                }
                if (z !== undefined) {
                    currentZ += z;
                }
                if (e !== undefined) {
                    currentE += e;
                }
            } else {
                if (x !== undefined) {
                    currentX = x + offsetX;
                }
                if (y !== undefined) {
                    currentY = y + offsetY;
                }
                if (z !== undefined) {
                    currentZ = z + offsetZ;
                }
                if (e !== undefined) {
                    currentE = e + offsetE;
                }
            }

            const moveMaterial = (currentE > startE) ? materialSolid : materialMove;

            move.add(new THREE.LineSegments(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(startX, startY, startZ),
                    new THREE.Vector3(currentX, currentY, currentZ),
                ]),
                moveMaterial,
            ));

            if (moveMaterial === currentLineMaterial && currentLayer.z === currentZ) {
                currentLine.push(new THREE.Vector3(currentX, currentY, currentZ));
            } else {
                pushCurrentLine();
                currentLine = [
                    new THREE.Vector3(startX, startY, startZ),
                    new THREE.Vector3(currentX, currentY, currentZ),
                ];
                currentLineMaterial = moveMaterial;
            }
        };

        switch (cmd.code) {
            case 'G0': // Linear move
            case 'G1': // Linear move
                addLinePoint(cmd.X, cmd.Y, cmd.Z, cmd.E);
                break;
            case 'G2': // Arc1
            case 'G3': // Arc2
                // TODO: Handle stuff
                console.warn('Encountered G2/G3 ARC command. Not handled yet!');
                break;
            case 'G28': // Home
            case 'G29': // Autolevel
                offsetX = 0;
                offsetY = 0;
                offsetZ = 0;
                offsetE = 0;
                positionRelative = false;
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

        if (move.children.length < 1) {
            continue;
        }

        if (currentZ !== currentLayer.z) {
            move.index = 0;
            currentLayer = new Layer(currentZ);
            model.add(currentLayer);
        }

        currentLayer.moves.push(move);
    }

    pushCurrentLine();

    return model;
}
