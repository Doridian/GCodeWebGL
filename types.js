'use strict';

class Vector {
    // x and y are absolute
    // e is a delta
    constructor(x, y, e) {
        this.x = x;
        this.y = y;
        this.e = e;
    }
}

class Layer {
    constructor(z) {
        this.z = z;
        this.points = [];
    }
}

class GCode {
    constructor(str) {
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

        this.raw = cmd;
        this.code = cmd.shift();

        for (const arg of cmd) {
            const a = arg.charAt(0);
            this[a] = parseFloat(arg.substr(1) || '1', 10);
        }
    }
}

class Model {
    constructor(layers, width) {
        this.layers = layers;
        this.width = width;
    }
}