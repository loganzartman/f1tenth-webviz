class Visualizer {
    constructor() {
        this.renderer = new THREE.WebGLRenderer();
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera();

        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = -1;
        this.camera.lookAt(0, 0, 1);
        this.camera.zoom = 0.02;

        this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 500;
        
        this.renderer.setClearColor(Colors.bg);
        this.updateRenderer(window.innerWidth, window.innerHeight);
        
        this.worldMap = new WorldMap();
        this.scene.add(this.worldMap.lines);

        this.pointCloud = new PointCloud();
        this.scene.add(this.pointCloud.points);

        this.laserScan = new PointCloud({color: Colors.laserScan});
        this.scene.add(this.laserScan.points);
        
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
        this.camera.near = -10;
        this.camera.far = 10;
        this.camera.updateProjectionMatrix();
        this.controls.handleResize();
    }
    
    run() {
        this.controls.update();
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.run());
    }
}
