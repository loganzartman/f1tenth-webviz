const MAP_BLANK = "--blank--";

const Colors = {
    bg: 0x201819,
    pointCloud: 0x20dd80,
    laserScan: 0xdd8020,
    walls: 0x2080dd
};

const params = {
    paused: false,
    connection: {
        hostname: "localhost",
        port: 10272
    },
    viz: {
        mapName: "GDC1"
    }
};

const stats = {
    connected: false
};

let viz;
let socket;

async function onload() {    
    // set up visualizer
    viz = new Visualizer();
    await viz.worldMap.loadAmrl(params.viz.mapName);
    window.addEventListener("resize", () => 
        viz.updateRenderer(window.innerWidth, window.innerHeight));
    document.body.appendChild(viz.renderer.domElement);
    viz.run();

    // create dat.GUI interface
    buildGui();

    // create websocket connection
    reconnect();
    setInterval(() => {
        if (!stats.connected)
            reconnect();
    }, 500);
    window.addEventListener("beforeunload", () => socket.close());
}
window.addEventListener("load", async () => onload(), false);

function reconnect() {
    if (socket) {
        if (socket.readyState === WebSocket.CONNECTING)
            return;
        socket.close();
    }

    // no way to suppress connection errors as they are async
    socket = new WebSocket(`ws://${params.connection.hostname}:${params.connection.port}`);

    socket.addEventListener("message", async event => {
        if (params.paused)
            return;
        const buffer = await event.data.arrayBuffer();
        const parser = new DataParser(buffer);
        const msg = parser.readMessage();
        console.log(msg);
        updatePoints(msg);
        updateLaserScan(msg);
    });
    socket.addEventListener("open", _ => {stats.connected = true;});
    socket.addEventListener("close", _ => {stats.connected = false;});
}

function buildGui() {
    const gui = new dat.GUI({autoPlace: false});
    document.getElementById("dat-container").appendChild(gui.domElement);
    gui.useLocalStorage = true;

    gui.add(params, "paused");

    gui.remember(params.connection);
    const guiConnection = gui.addFolder("Connection");
    guiConnection.add(params.connection, "hostname").name("IP / hostname").onFinishChange(() => reconnect());
    guiConnection.add(params.connection, "port").min(0).step(1).onFinishChange(() => reconnect());
    
    gui.remember(params.viz);
    const guiViz = gui.addFolder("Visualization");
    guiViz.add(params.viz, "mapName", [MAP_BLANK, "GDC1", "GDC2", "GDC3"]).onChange(
        value => viz.worldMap.loadAmrl(value));

    // stats widgets
    const statsContainer = document.getElementById("stats-container");
    statWidget(stats, "connected", statsContainer, connected => {
        const elem = document.createElement("div");
        elem.innerText = connected ? "✔ connected" : "❗ connecting...";
        elem.className = ["status", connected ? "status--connected" : "status--disconnected"].join(" ");
        return elem;
    });
}

function getPoseMatrix(msg) {
    const pose = msg.robotPose;
    const mat = new THREE.Matrix3();
    mat.translate(pose.x, pose.y);
    mat.rotate(pose.theta);
    return mat;
}

function updatePoints(msg) {
    viz.pointCloud.setSize(msg.points.length);
    msg.points.forEach((p, i) => {
        viz.pointCloud.position.setXYZ(
            i,
            p.point.x,
            p.point.y,
            0
        );
    });
    viz.pointCloud.updatePositions();
}

function updateLaserScan(msg) {
    const pose = getPoseMatrix(msg);
    const nLaserPoints = msg.laser.ranges.length;
    const lasert0 = msg.laser.angle_min;
    const lasert1 = msg.laser.angle_max;
    viz.laserScan.setSize(nLaserPoints);
    for (let i = 0; i < nLaserPoints; ++i) {
        const theta = lasert0 + i / nLaserPoints * (lasert1 - lasert0);
        const r = msg.laser.ranges[i];
        const pos = new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 1).applyMatrix3(pose);
        viz.laserScan.position.setXYZ(i, pos.x, pos.y, pos.z);
    }
    viz.laserScan.updatePositions();
}
