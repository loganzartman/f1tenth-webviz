const Colors = {
    bg: 0x201819,
    pointCloud: 0x20dd80,
    walls: 0x2080dd
};

async function onload() {
    const viz = new Visualizer();
    await viz.worldMap.load("http://amrl.cs.utexas.edu/f1tenth_course/maps/GDC1.json");

    
    const socket = new WebSocket("ws://localhost:10272/");
    socket.addEventListener("message", async event => {
        const buffer = await event.data.arrayBuffer();
        const parser = new DataParser(buffer);
        const msg = parser.readMessage();
        viz.pointCloud.geometry.setFromPoints(
            msg.points.map(point => new THREE.Vector3(point.point.x, point.point.y)));
    });
    window.addEventListener("beforeunload", () => {
        socket.close();
    });
    
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

        this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 500;
        
        this.scale = 10;
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = -1;
        this.camera.lookAt(0, 0, 1);
        
        this.renderer.setClearColor(Colors.bg);
        this.updateRenderer(window.innerWidth, window.innerHeight);
        
        this.worldMap = new WorldMap();
        this.scene.add(this.worldMap.lines);

        this.pointCloud = new PointCloud();
        this.scene.add(this.pointCloud.points);
        
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

class PointCloud {
    constructor() {
        this.geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
            color: Colors.pointCloud,
            size: 5
        });
        this.points = new THREE.Points(this.geometry, material);
    }
}
    
class WorldMap {
    constructor() {
        this.geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: Colors.walls,
            linewidth: 1
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
