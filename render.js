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
const controls = new THREE.FlyControls(camera, renderAdapter.domElement);
const clock = new THREE.Clock();
renderAdapter.setSize(window.innerWidth, window.innerHeight);

let layerLimitSlider;

function renderLoop() {
    requestAnimationFrame(renderLoop);

    const delta = clock.getDelta();
    controls.update(delta);
    renderAdapter.render(scene, camera);
}

function initializeThree() {
    layerLimitSlider = document.getElementById('layerLimit');
    document.body.appendChild(renderAdapter.domElement);
    
    controls.movementSpeed = 100;
    controls.rollSpeed = Math.PI / 6;
    controls.autoForward = false;
    controls.dragToLook = true;

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
    }

    _pushSceneObject(obj, layer, inScene) {
        this.sceneObjects.push({
            obj,
            layer,
            shouldBeInScene: inScene,
            inScene,
        });
        if (inScene) {
            scene.add(obj);
        }
        return obj;
    }

    renderLayerSegment(vertices, layer, solid) {
        if (vertices.length < 2) {
            return;
        }
    
        console.log(`Rendering mesh of ${vertices.length} vertices at layer ${layer.z} with solid ${solid}`);

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

    updateLayerLimit() {
        console.log('Updating scene...');
        for (const scObj of this.sceneObjects) {
            if (!scObj.shouldBeInScene) {
                continue;
            }
            if (scObj.layer.z > layerLimitSlider.value) {
                if (scObj.inScene) {
                    scene.remove(scObj.obj);
                    scObj.inScene = false;
                }
            } else {
                if (!scObj.inScene) {
                    scene.add(scObj.obj);
                    scObj.inScene = true;
                }
            }
        }
    }

    render() {
        for (const scObj of this.sceneObjects) {
            const obj = scObj.obj;
            if (scObj.inScene) {
                scene.remove(obj);
            }
            if (obj.dispose) {
                obj.dispose();
            }
        }
        this.sceneObjects = [];

        let maxZ = 0;

        let init = undefined;
        for (const layer of this.model.layers) {
            init = this.renderLayer(layer, init);
            if (layer.z > maxZ) {
                maxZ = layer.z;
            }
        }

        layerLimitSlider.max = maxZ;
        layerLimitSlider.value = maxZ;
        layerLimitSlider.addEventListener('input', () => this.updateLayerLimit());
    }
}
