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
        this.updateRenderer(window.innerWidth, window.innerHeight);
    }

    updateRenderer(w, h) {
        this.w = w;
        this.h = h;
        this.renderer.setSize(w, h);
    }

    updateCamera() {
        this.camera.left = 0;
        this.camera.right = this.w;
        this.camera.top = 0;
        this.camera.bottom = this.h;
        this.camera.near = 0;
        this.camera.far = 1;
    }

    run() {
        this.updateCamera();
    }
}
