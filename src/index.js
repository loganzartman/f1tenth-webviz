const MAP_BLANK = "--blank--";
const LIDAR_OFFSET = 0.2;

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

    createHotkeys();
}
window.addEventListener("load", async () => onload(), false);

function createHotkeys() {
    window.addEventListener("keydown", (event) => {
        if (event.key === "p") {
            params.paused = !params.paused;
        } else {
            return;
        }
        event.preventDefault();
    });
}

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
        updateLines(msg);
        updateLaserScan(msg);
        updatePose(msg);
    });
    socket.addEventListener("open", _ => {stats.connected = true;});
    socket.addEventListener("close", _ => {stats.connected = false;});
}

function buildGui() {
    const gui = new dat.GUI({autoPlace: false});
    document.getElementById("dat-container").appendChild(gui.domElement);
    gui.useLocalStorage = true;

    gui.add(params, "paused").listen();

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
        elem.className = ["status", connected ? "status--green" : "status--red"].join(" ");
        return elem;
    });
    statWidget(params, "paused", statsContainer, paused => {
        const elem = document.createElement("div");
        elem.innerText = paused ? "⏸" : "▶";
        elem.className = ["status", paused ? "status--red" : "status--green"].join(" ");
        return elem;
    });
}

function getPoseMatrix4(msg) {
    const pose = msg.robotPose;
    const mat = new THREE.Matrix4().makeTranslation(pose.x, pose.y, 0);
    mat.multiply(new THREE.Matrix4().makeRotationZ(pose.theta));
    return mat;
}

function updatePose(msg) {
    const pose = getPoseMatrix4(msg);
    viz.robot.matrixAutoUpdate = false;
    viz.robot.matrix.copy(pose);
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

function updateLines(msg) {
    // TODO: does applying pose match original implementation? is this intentional?
    const pose = getPoseMatrix4(msg);
    viz.lines.setSize(msg.lines.length);
    msg.lines.forEach((l, i) => {
        const index = i * 2;
        const color = new THREE.Color(l.color);

        const a = new THREE.Vector4(l.p0.x, l.p0.y, 0, 1).applyMatrix4(pose);
        viz.lines.position.setXYZ(index, a.x, a.y, 0);
        viz.lines.color.setXYZ(index, color.r, color.g, color.b);

        const b = new THREE.Vector4(l.p1.x, l.p1.y, 0, 1).applyMatrix4(pose);
        viz.lines.position.setXYZ(index + 1, b.x, b.y, 0);
        viz.lines.color.setXYZ(index + 1, color.r, color.g, color.b);
    });
    viz.lines.updateAttributes();
}

function updateLaserScan(msg) {
    const transform = getPoseMatrix4(msg)
        .multiply(new THREE.Matrix4().makeTranslation(LIDAR_OFFSET, 0, 0));
    const nLaserPoints = msg.laser.ranges.length;
    const lasert0 = msg.laser.angle_min;
    const lasert1 = msg.laser.angle_max;
    viz.laserScan.setSize(nLaserPoints);
    for (let i = 0; i < nLaserPoints; ++i) {
        const theta = lasert0 + i / nLaserPoints * (lasert1 - lasert0);
        const r = msg.laser.ranges[i];
        const pos = new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0, 1).applyMatrix4(transform);
        viz.laserScan.position.setXYZ(i, pos.x, pos.y, pos.z);
    }
    viz.laserScan.updatePositions();
}
