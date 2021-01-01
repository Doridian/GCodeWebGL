'use strict';

const materialSolid = new THREE.LineBasicMaterial({
	color: 0x00ff00
});
const materialMove = new THREE.LineBasicMaterial({
	color: 0xff0000
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderAdapter = new THREE.WebGLRenderer();
const controls = new THREE.OrbitControls(camera, renderAdapter.domElement);
const clock = new THREE.Clock();
renderAdapter.setSize(window.innerWidth, window.innerHeight);

let layerMinSlider, layerMaxSlider;

function renderLoop() {
    requestAnimationFrame(renderLoop);

    const delta = clock.getDelta();
    controls.update(delta);
    renderAdapter.render(scene, camera);
}

function initializeThree() {
    layerMinSlider = document.getElementById('layerMin');
    layerMaxSlider = document.getElementById('layerMax');
    document.body.appendChild(renderAdapter.domElement);

    camera.position.x = 500;
    camera.position.y = 500;
    camera.position.z = 500;

    renderLoop();
}

function pToV(p, layer) {
    return new THREE.Vector3(p.x, p.y, layer.z);
}

class Renderer {
    constructor(model) {
        this.model = model;
        this.sceneObjects = [];

        this.object = new THREE.Group();

        scene.add(this.object);

        const f = this.updateLayerLimit.bind(this);
        layerMinSlider.addEventListener('input', f);
        layerMaxSlider.addEventListener('input', f);
    }

    _pushSceneObject(obj, layer, inScene) {
        this.sceneObjects.push({
            obj,
            layer,
            shouldBeInScene: inScene,
            inScene,
        });
        if (inScene) {
            this.object.add(obj);
        }
        return obj;
    }

    renderLayerSegment(vertices, layer, solid) {
        if (vertices.length < 2) {
            return;
        }

        const geo = this._pushSceneObject(new THREE.BufferGeometry().setFromPoints(vertices), layer, false);
        this._pushSceneObject(new THREE.Line(geo, solid ? materialSolid : materialMove), layer, true);
    }

    renderLayer(layer, init) {
        let vertices = init && [init[0]] || [new THREE.Vector3(0,0,0)];
        let solid = init && init[1];

        for (const p of layer.points) {
            const curSolid = p.e > 0;
            if (solid !== curSolid) {
                this.renderLayerSegment(vertices, layer, solid);
                vertices = [vertices[vertices.length - 1]];
                solid = curSolid;
            }

            vertices.push(pToV(p, layer));
        }

        this.renderLayerSegment(vertices, layer, solid);
        return [vertices[vertices.length - 1], solid];
    }

    updateLayerLimit(evt) {
        let minV = parseFloat(layerMinSlider.value);
        let maxV = parseFloat(layerMaxSlider.value);
        if (maxV < minV) {
            if (evt.target === layerMaxSlider) {
                layerMinSlider.value = layerMaxSlider.value;
                minV = maxV;
            } else {
                layerMaxSlider.value = layerMinSlider.value;
                maxV = minV;
            }
        }

        for (const scObj of this.sceneObjects) {
            if (!scObj.shouldBeInScene) {
                continue;
            }
            if (scObj.layer.z > maxV || scObj.layer.z < minV) {
                if (scObj.inScene) {
                    this.object.remove(scObj.obj);
                    scObj.inScene = false;
                }
            } else {
                if (!scObj.inScene) {
                    this.object.add(scObj.obj);
                    scObj.inScene = true;
                }
            }
        }
    }

    render() {
        for (const scObj of this.sceneObjects) {
            const obj = scObj.obj;
            if (scObj.inScene) {
                this.object.remove(obj);
            }
            if (obj.dispose) {
                obj.dispose();
            }
        }
        this.sceneObjects = [];

        let minZ = 9999;
        let maxZ = 0;
        let minDiff = 9999;

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
        let mostCommonZ = 0.2;
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
    }
}
