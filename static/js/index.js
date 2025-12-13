import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.addEventListener('load', function() {
    const gallery = document.getElementById("videoGalleryStairs");
    if (gallery) {
        const leftBtn = document.getElementById("scrollLeftBtnStairs");
        const rightBtn = document.getElementById("scrollRightBtnStairs");
        const items = gallery.querySelectorAll(".video-item");
        const videoWidth = 170;
        const gap = 10;
        const slideWidth = videoWidth + gap;
        const viewportWidth = document.querySelector(".video-viewport").offsetWidth;
        const totalWidth = items.length * slideWidth - gap;
        const maxOffset = -(totalWidth - viewportWidth);
        let offset = 0;
        rightBtn.addEventListener("click", () => {
            offset -= slideWidth;
            if (offset < maxOffset) offset = maxOffset;
            gallery.style.transform = `translateX(${offset}px)`;
        });
        leftBtn.addEventListener("click", () => {
            offset += slideWidth;
            if (offset > 0) offset = 0;
            gallery.style.transform = `translateX(${offset}px)`;
        });
    }
    
    var carousels = bulmaCarousel.attach('.carousel', {
        slidesToScroll: 1,
        slidesToShow: 1,
        loop: false,
        autoplay: false,
    });
    bulmaSlider.attach();

    const container = document.getElementById('smpl-container');
    if (!container) {
        console.error('smpl-container not found！');
        return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0.5, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.enableReset = false;
    controls.minDistance = 1.0;
    controls.maxDistance = 5.0;
    controls.update();

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-4, 2, -3);
    scene.add(fillLight);
    
    const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
    topLight.position.set(0, 6, 0);
    scene.add(topLight);

    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    scene.add(hemi);

    const clock = new THREE.Clock();
    const loader = new GLTFLoader();

    function disposeModel(model) {
        if (!model) return;

        model.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();

            if (obj.material) {
                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                materials.forEach(m => {
                    for (const key in m) {
                        if (m[key] && m[key].isTexture) m[key].dispose();
                    }
                    m.dispose();
                });
            }
        });
    }

    let currentModel = null;
    let mixer = null;
    let loadId = 0;
    
    function loadGLB(path) {
        const thisLoadId = ++loadId;
    
        if (currentModel) {
            scene.remove(currentModel);
            if (mixer) {
                mixer.stopAllAction();
                mixer.uncacheRoot(currentModel);
                mixer = null;
            }
            disposeModel(currentModel);
            currentModel = null;
            renderer.clear();
        }
    
        loader.load(path, function(gltf) {
            if (thisLoadId !== loadId) {
                disposeModel(gltf.scene);
                return;
            }
    
            currentModel = gltf.scene;

            let hasVertexColors = false;
            currentModel.traverse((child) => {
                if (child.isMesh && child.geometry && child.geometry.attributes.color) {
                    hasVertexColors = true;
                    console.log("找到顶点颜色属性:", child.geometry.attributes.color);
                }
            });
            
            if (hasVertexColors) {
                currentModel.traverse((child) => {
                    if (child.isMesh && child.geometry && child.geometry.attributes.color) {
                        if (child.material) {
                            const newMaterial = child.material.clone();
                            // newMaterial.emissive = new THREE.Color(0x111111);  // 增加自发光
                            // newMaterial.emissiveIntensity = 0.2;              // 自发光强度
                            newMaterial.vertexColors = true;
                            newMaterial.needsUpdate = true;
                            newMaterial.roughness = 0.6;      // 降低粗糙度
                            newMaterial.metalness = 0.0;      // 无金属感
                            child.material = newMaterial;
                        }
                        child.geometry.attributes.color.needsUpdate = true;
                        child.geometry.attributes.position.needsUpdate = true;
                    }
                });
            } else {
                console.warn("模型没有顶点颜色属性");
            }
            
            scene.add(currentModel);
    
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(currentModel);
                const action = mixer.clipAction(gltf.animations[0]);
                action.play();
            }
    
            const box = new THREE.Box3().setFromObject(currentModel);
            const center = new THREE.Vector3();
            box.getCenter(center);
    
            camera.position.set(center.x, center.y + 3, center.z + 3);
            controls.target.copy(center);
            controls.update();
        }, undefined, err => {
            console.error("Failed to load GLB:", err);
        });
    }

    const selector = document.getElementById("glb-selector");
    if (selector) {
        selector.addEventListener("change", function() {
            loadGLB(this.value);
        });
        loadGLB(selector.value);
    }

    // ==============================
    // Render Loop
    // ==============================
    function animate() {
        requestAnimationFrame(animate);

        if (mixer) mixer.update(clock.getDelta());

        renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
});
