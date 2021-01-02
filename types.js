'use strict';

const materialSolid = new THREE.LineBasicMaterial({
	color: 0x00aa00,
});
const materialMove = new THREE.LineBasicMaterial({
	color: 0x0000aa,
});
const materialSolidCurrent = new THREE.LineBasicMaterial({
	color: 0x00ffff,
});
const materialMoveCurrent = new THREE.LineBasicMaterial({
	color: 0xff0000,
});

class DisposableParent extends THREE.Group {
    constructor() {
        super();
    }

    dispose() {
        super.dispose();
        this.removeFromParent();
        for (const o of this.children) {
            if (o.dispose) {
                o.dispose();
            }
            if (o.geometry) {
                o.geometry.dispose();
            }
        }
    }
}

class Move extends DisposableParent {
    constructor(gcode, index) {
        super();
        this.index = index;
        this.gcode = gcode;
    }
}

class Layer extends DisposableParent {
    constructor(z) {
        super();
        this.z = z;
        this.moves = [];
    }

    dispose() {
        super.dispose();
        for (const o of this.moves) {
            o.dispose();
        }
    }
}

class GCode {
    constructor(str) {
        this.raw = str;

        const cmd = str
            .toUpperCase()
            .trim()
            .replace(/;.*$/, '')
            .replace(/  +/g, '')
            .trim()
            .split(' ');
            

        if (cmd.length < 1) {
            return;            
        }

        this.code = cmd.shift();

        for (const arg of cmd) {
            const a = arg.charAt(0);
            this[a] = parseFloat(arg.substr(1) || '1', 10);
        }
    }
}

class Model extends DisposableParent {
    constructor(width) {
        super();
        this.width = width;
    }
}