const Colors = {
    bg: 0x201819,
    pointCloud: 0x20dd80,
    laserScan: 0xdd8020,
    walls: 0x2080dd
};

const params = {
    connection: {
        hostname: "localhost",
        port: 10272
    },
    mapName: "GDC1"
};

let viz;
let socket;

async function onload() {    
    // set up visualizer
    viz = new Visualizer();
    await viz.worldMap.loadAmrl(params.mapName);
    window.addEventListener("resize", () => 
        viz.updateRenderer(window.innerWidth, window.innerHeight));
    document.body.appendChild(viz.renderer.domElement);
    viz.run();

    // create dat.GUI interface
    buildGui();

    // create websocket connection
    reconnect();
    window.addEventListener("beforeunload", () => socket.close());
}
window.addEventListener("load", async () => onload(), false);

function reconnect() {
    if (socket) {
        socket.close();
    }
    socket = new WebSocket(`ws://${params.connection.hostname}:${params.connection.port}`);

    socket.addEventListener("message", async event => {
        const buffer = await event.data.arrayBuffer();
        const parser = new DataParser(buffer);
        const msg = parser.readMessage();
        viz.pointCloud.geometry.setFromPoints(
            msg.points.map(point => new THREE.Vector3(point.point.x, point.point.y)));
        
        console.log(msg);
        const laserPoints = [];
        const nLaserPoints = msg.laser.ranges.length;
        const lasert0 = msg.laser.angle_min;
        const lasert1 = msg.laser.angle_max;
        for (let i = 0; i < nLaserPoints; ++i) {
            const theta = lasert0 + i / nLaserPoints * (lasert1 - lasert0);
            const r = msg.laser.ranges[i];
            laserPoints.push(new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0)); 
        }
        viz.laserScan.geometry.setFromPoints(laserPoints);
    });
}

function buildGui() {
    const gui = new dat.GUI({autoPlace: false});
    document.getElementById("dat-container").appendChild(gui.domElement);

    const guiConnection = gui.addFolder("Connection");
    guiConnection.add(params.connection, "hostname").name("IP / hostname").onFinishChange(() => reconnect());
    guiConnection.add(params.connection, "port").min(0).step(1).onFinishChange(() => reconnect());
    
    gui.add(params, "mapName", ["GDC1", "GDC2", "GDC3"]).onChange(
        value => viz.worldMap.loadAmrl(value));
}

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

class PointCloud {
    constructor({color=Colors.pointCloud}={}) {
        this.geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
            color: color,
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
    
    async loadAmrl(name) {
        const url = `http://amrl.cs.utexas.edu/f1tenth_course/maps/${name}.json`;
        const result = await fetch(url);
        const data = await result.json();
        this.updateFromSegments(data);
    }

    updateFromSegments(segments) {
        this.geometry.setFromPoints(segments.flatMap(s => {
            return [
                new THREE.Vector3(s.p0.x, s.p0.y),
                new THREE.Vector3(s.p1.x, s.p1.y),
            ];
        }));
    }
}
