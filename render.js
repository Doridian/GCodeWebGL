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


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderAdapter = new THREE.WebGLRenderer();
const controls = new THREE.OrbitControls(camera, renderAdapter.domElement);
const clock = new THREE.Clock();
renderAdapter.setSize(window.innerWidth, window.innerHeight);

let layerMinSlider, layerMaxSlider, progressSlider;

function renderLoop() {
    requestAnimationFrame(renderLoop);

    const delta = clock.getDelta();
    controls.update(delta);
    renderAdapter.render(scene, camera);
}

function initializeThree() {
    layerMinSlider = document.getElementById('layerMin');
    layerMaxSlider = document.getElementById('layerMax');
    progressSlider = document.getElementById('progress');
    document.body.appendChild(renderAdapter.domElement);

    camera.position.x = 500;
    camera.position.y = 500;
    camera.position.z = 500;

    renderLoop();
}

function tryDispose(o) {
    if (o.dispose) {
        o.dispose();
    }
}

class Renderer {
    constructor(model) {
        this.model = model;
        this.renderObjects = [];
        this.currentLimitedObjects = [];

        this.object = new THREE.Group();

        scene.add(this.object);

        const f = this.updateLayerLimit.bind(this);
        layerMinSlider.addEventListener('input', f);
        layerMaxSlider.addEventListener('input', f);
        progressSlider.addEventListener('input', f);
    }

    renderLayerSegment(vertices, layer, solid, i) {
        if (vertices.length < 2) {
            return;
        }

        const geo = new THREE.BufferGeometry().setFromPoints(vertices);
        const line = new THREE.Line(geo, solid ? materialSolid : materialMove);

        this.renderObjects.push({
            layer,
            geo,
            line,
            vertexCount: vertices.length,
            firstPointIdx: i - vertices.length,
            inObject: false,
        });
    }

    renderLayer(layer, init) {
        let vertices = init && [init[0]] || [new THREE.Vector3(0,0,0)];
        let solid = init && init[1];
        let previousE = init && init[2] || 0;

        for (let i = 0; i < layer.points.length; i++) {
            const p = layer.points[i];
            const curSolid = p.e > previousE;
            previousE = p.e;
            if (solid !== curSolid) {
                this.renderLayerSegment(vertices, layer, solid, i);
                vertices = [vertices[vertices.length - 1]];
                solid = curSolid;
            }

            vertices.push(new THREE.Vector3(p.x, p.y, p.z));
        }

        this.renderLayerSegment(vertices, layer, solid, layer.points.length);
        return [vertices[vertices.length - 1], solid, previousE];
    }

    updateLayerLimit(evt) {
        let minV = parseFloat(layerMinSlider.value);
        let maxV = parseFloat(layerMaxSlider.value);
        let progressV = parseFloat(progressSlider.value);
        let progressMax = parseFloat(progressSlider.max);

        if (maxV < minV) {
            if (evt && evt.target === layerMaxSlider) {
                layerMinSlider.value = layerMaxSlider.value;
                minV = maxV;
            } else {
                layerMaxSlider.value = layerMinSlider.value;
                maxV = minV;
            }
        }

        const minDiff = parseFloat(layerMaxSlider.step) - 0.05;

        if (this.currentLimitedObjects.length > 0) {
            for (const rObj of this.currentLimitedObjects) { 
                rObj.line.geometry.setDrawRange(0, rObj.vertexCount);
            }
            this.currentLimitedObjects = [];
        }

        for (const rObj of this.renderObjects) {
            const obj = rObj.line;
            let shouldDraw = true;

            const isCurrent = Math.abs(rObj.layer.z - maxV) < minDiff;

            if (rObj.layer.z > maxV || rObj.layer.z < minV) {
                shouldDraw = false;
            } else {
                const isSolid = obj.material === materialSolid || obj.material === materialSolidCurrent;

                if (isSolid) {
                    obj.material = isCurrent ? materialSolidCurrent : materialSolid;
                } else {
                    obj.material = isCurrent ? materialMoveCurrent : materialMove;
                }
            }
            
            if (isCurrent) {
                if (progressMax !== rObj.layer.points.length) {
                    progressV = (progressV / progressMax) * rObj.layer.points.length;
                    progressMax = rObj.layer.points.length;
                    progressSlider.max = progressMax;
                    progressSlider.value = progressV;
                }

                if (rObj.firstPointIdx >= progressV) {
                    shouldDraw = false;
                } else if (rObj.firstPointIdx + rObj.vertexCount >= progressV) {
                    this.currentLimitedObjects.push(rObj);
                    obj.geometry.setDrawRange(0, progressV - rObj.firstPointIdx);
                    console.log(`LIMITING TO ${progressV - rObj.firstPointIdx} ${progressV} ${rObj.vertexCount}`);
                }
            }

            if (shouldDraw) {
                if (!rObj.inObject) {
                    this.object.add(obj);
                    rObj.inObject = true;
                }
            } else {
                if (rObj.inObject) {
                    this.object.remove(obj);
                    rObj.inObject = false;
                }
            }
        }
    }

    render() {
        for (const rObj of this.renderObjects) {
            const obj = rObj.line;
            if (rObj.inObject) {
                this.object.remove(obj);
            }
            tryDispose(rObj.line);
            tryDispose(rObj.geo);
        }
        this.renderObjects = [];

        let minZ = 9999;
        let maxZ = 0;

        const layerZValues = [];

        let init = undefined;
        for (const layer of this.model.layers) {
            init = this.renderLayer(layer, init);
            if (layer.z > maxZ) {
                maxZ = layer.z;
            }
            if (layer.z < minZ) {
                minZ = layer.z;
            }
            layerZValues.push(layer.z);
        }

        layerZValues.sort((a, b) => a - b);
        const layerDiffs = new Map();
        for (let i = 1; i < layerZValues.length; i++) {
            const curZ = layerZValues[i];
            const lastZ = layerZValues[i - 1];
            const zDiff = Math.round((curZ - lastZ) * 100);
            if (zDiff <= 0) {
                continue;
            }
            layerDiffs.set(zDiff, (layerDiffs.get(zDiff) || 0) + 1);
        }

        let mostCommonZCount = 0;
        let mostCommonZ = 20;
        for (const [k,v] of layerDiffs.entries()) {
            if (v <= mostCommonZCount) {
                continue;
            }
            mostCommonZCount = v;
            mostCommonZ = k;
        }

        layerMinSlider.step = mostCommonZ / 100;
        layerMinSlider.max = maxZ;
        layerMinSlider.min = minZ;
        layerMinSlider.value = minZ;

        layerMaxSlider.step = layerMinSlider.step;
        layerMaxSlider.max = maxZ;
        layerMaxSlider.min = minZ;
        layerMaxSlider.value = maxZ;

        this.updateLayerLimit();
    }
}
