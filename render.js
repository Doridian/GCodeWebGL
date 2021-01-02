'use strict';

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

class Renderer {
    constructor(model) {
        this.model = model;
        this.object = new THREE.Group();
        scene.add(this.object);

        const f = this.updateLayerLimit.bind(this);
        layerMinSlider.addEventListener('input', f);
        layerMaxSlider.addEventListener('input', f);
        progressSlider.addEventListener('input', f);
    }

    unrenderLayer(layer) {
        this.object.remove(layer);
    }

    renderLayer(layer, isCurrent) {
        for (const move of layer.children) {
            for (const obj of move.children) {
                if (obj.material === materialMove || obj.material === materialMoveCurrent) {
                    obj.material = isCurrent ? materialMoveCurrent : materialMove;
                } else {
                    obj.material = isCurrent ? materialSolidCurrent : materialSolid;
                }
            }
        }
    }

    updateLayerLimit(evt) {
        let minV = parseInt(layerMinSlider.value, 10);
        let maxV = parseInt(layerMaxSlider.value, 10);
        let progressV = parseInt(progressSlider.value, 10);
        let progressMax = parseInt(progressSlider.max, 10);

        if (maxV < minV) {
            if (evt && evt.target === layerMaxSlider) {
                layerMinSlider.value = layerMaxSlider.value;
                minV = maxV;
            } else {
                layerMaxSlider.value = layerMinSlider.value;
                maxV = minV;
            }
        }

        for (let i = 0; i < this.model.children.length; i++) {
            const layer = this.model.children[i];
            if (i >= minV && i <= maxV) {
                const isCurrent = i === maxV;
                this.renderLayer(layer, isCurrent);
                layer.visible = true;
            } else {
                layer.visible = false;
            }
        }

        /*
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
        */
    }

    render() {
        this.object.add(this.model);
        
        let minZ = 9999;
        let maxZ = 0;

        const layerZValues = [];

        for (const layer of this.model.children) {
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

        layerMinSlider.max = this.model.children.length - 1;
        layerMinSlider.min = 0;
        layerMinSlider.value = layerMinSlider.min;

        layerMaxSlider.max = layerMinSlider.max
        layerMaxSlider.min = minZ;
        layerMaxSlider.value = layerMaxSlider.max;

        this.updateLayerLimit();
    }
}
