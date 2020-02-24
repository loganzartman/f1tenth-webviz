async function onload() {
    const viz = new Visualizer();
    await viz.worldMap.load("http://amrl.cs.utexas.edu/f1tenth_course/maps/GDC1.json");

    window.addEventListener("resize", () => 
        viz.updateRenderer(window.innerWidth, window.innerHeight), false);
    document.body.appendChild(viz.renderer.domElement);

    viz.run();
}
window.addEventListener("load", async () => onload(), false);

class Visualizer {
    constructor() {
        this.renderer = new THREE.WebGLRenderer();
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera();

        this.scale = 100;
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = -1;
        this.camera.lookAt(0, 0, 1);

        this.renderer.setClearColor(0xaaaaaa);
        this.updateRenderer(window.innerWidth, window.innerHeight);

        this.worldMap = new WorldMap();
        this.scene.add(this.worldMap.lines);

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
        this.camera.left = -this.scale;
        this.camera.right = this.scale;
        this.camera.top = -this.scale / aspectRatio;
        this.camera.bottom = this.scale / aspectRatio;
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

class WorldMap {
    constructor() {
        this.data = null;
        this.geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: 0x0000FF,
            linewidth: 0.1
        });
        this.lines = new THREE.LineSegments(this.geometry, material);
    }

    async load(url) {
        const result = await fetch(url);
        const data = await result.json();
        this.geometry.setFromPoints(data.flatMap(p => {
            return [
                new THREE.Vector3(p.p0.x, p.p0.y),
                new THREE.Vector3(p.p1.x, p.p1.y),
            ];
        }));
    }
}