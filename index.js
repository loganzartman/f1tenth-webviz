function onload() {
    const viz = new Visualizer();

    window.addEventListener("resize", () => 
        viz.updateRenderer(window.innerWidth, window.innerHeight), false);
    document.body.appendChild(viz.renderer.domElement);

    viz.run();
}
window.addEventListener("load", () => onload(), false);

class Visualizer {
    constructor() {
        this.renderer = new THREE.WebGLRenderer();
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera();

        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = -1;
        this.camera.lookAt(0, 0, 1);

        this.renderer.setClearColor(0xaaaaaa);
        this.updateRenderer(window.innerWidth, window.innerHeight);

        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.25),
            new THREE.MeshBasicMaterial({color: "red"})
        );
        this.scene.add(sphere);
    }

    updateRenderer(w, h) {
        this.w = w;
        this.h = h;
        this.renderer.setSize(w, h);
    }

    updateCamera() {
        const aspectRatio = this.w / this.h;
        this.camera.left = -1;
        this.camera.right = 1;
        this.camera.top = -1 / aspectRatio;
        this.camera.bottom = 1 / aspectRatio;
        this.camera.near = 0;
        this.camera.far = 2;
        this.camera.updateProjectionMatrix();
    }

    run() {
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.run());
    }
}
