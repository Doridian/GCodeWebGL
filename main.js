'use strict';

const GLOBAL_WIDTH = 0.4;

async function main() {
    initializeThree();

    const res = await fetch('file.gcode');
    const data = await res.text();

    const model = parseGCode(data, GLOBAL_WIDTH);
    const renderer = new Renderer(model);
    renderer.render();
    //renderer.render();

    console.log('DONE!');
}
