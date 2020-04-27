const ROBOT_WIDTH = .281;
const ROBOT_LENGTH = .43;

ROBOT_TEMPLATE = [
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(ROBOT_LENGTH, 0, 0),
    new THREE.Vector3(ROBOT_LENGTH, 0, 0), new THREE.Vector3(ROBOT_LENGTH-ROBOT_WIDTH/2, -ROBOT_WIDTH/2, 0),
    new THREE.Vector3(ROBOT_LENGTH, 0, 0), new THREE.Vector3(ROBOT_LENGTH-ROBOT_WIDTH/2, ROBOT_WIDTH/2, 0)
];

class Visualizer {
    constructor() {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.sortObjects = false;
        this.renderer.autoClear = false;

        this.scene = new THREE.Scene();
        this.ndcScene = new THREE.Scene();

        this.camera = new THREE.OrthographicCamera();
        this.camera.position.set(0, 0, -1);
        this.camera.lookAt(0, 0, 1);
        this.camera.scale.set(-1, -1, 1);
        this.camera.zoom = 0.02;

        this.controls = new CameraControls(this.camera, this.renderer.domElement);

        this.ndcCamera = new THREE.Camera();
        
        this.renderer.setClearColor(params.colors.bg);
        this.updateRenderer(window.innerWidth, window.innerHeight);

        // grid
        this.grid = new THREE.GridHelper(100, 50, new THREE.Color(params.colors.grid), new THREE.Color(params.colors.grid));
        this.grid.rotateX(Math.PI * 0.5);
        this.scene.add(this.grid);

        // map
        this.worldMap = new WorldMap();
        this.scene.add(this.worldMap.lines);

        // potential path arcs
        this.pathOptions = new Lines();
        this.scene.add(this.pathOptions.lines);

        // arbitrary point cloud data
        this.pointCloud = new PointCloud();
        this.scene.add(this.pointCloud.points);

        // LIDAR point cloud data
        this.laserScan = new PointCloud({
            material: new THREE.PointsMaterial({
                color: params.colors.laserScan,
                size: 5
            })
        });
        this.scene.add(this.laserScan.points);

        // arbitrary line visualizations
        this.lines = new Lines();
        this.scene.add(this.lines.lines);

        // arbitrary arc visualizations
        this.arcs = new Lines();
        this.scene.add(this.arcs.lines);
        
        // pose hypothesis particles
        this.particles = new Lines({material: new THREE.LineBasicMaterial({
            transparent: true,
            opacity: 0.5,
            color: params.colors.robot
        })});
        this.scene.add(this.particles.lines);

        const robotGeometry = new THREE.BufferGeometry();
        robotGeometry.setFromPoints(ROBOT_TEMPLATE);
        const robotMaterial = new THREE.LineBasicMaterial({
            color: params.colors.robot,
            linewidth: 3,
        });
        this.robot = new THREE.LineSegments(robotGeometry, robotMaterial);
        this.scene.add(this.robot);

        // phantom robot for pose setting
        const phantomPoseGeometry = new THREE.BufferGeometry();
        phantomPoseGeometry.setFromPoints(ROBOT_TEMPLATE);
        const phantomPoseMaterial = new THREE.LineBasicMaterial({
            color: params.colors.phantomRobot,
            linewidth: 3,
            transparent: true,
            opacity: 0.7
        });
        this.phantomPose = new THREE.LineSegments(phantomPoseGeometry, phantomPoseMaterial);
        this.phantomPose.visible = false;
        this.scene.add(this.phantomPose);

        // cursor display
        this.crosshair = new Lines({material: new THREE.LineBasicMaterial({
            color: params.colors.crosshair,
            transparent: true,
            opacity: 0.25
        })});
        this.ndcScene.add(this.crosshair.lines);
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
    }
    
    run() {
        this.updateCamera();
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.renderer.render(this.ndcScene, this.ndcCamera);
        requestAnimationFrame(() => this.run());
    }
}
