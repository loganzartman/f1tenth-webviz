const MAP_BLANK = "--blank--";

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
        updatePoints(msg);
        updateLaserScan(msg);
    });
}

function buildGui() {
    const gui = new dat.GUI({autoPlace: false});
    document.getElementById("dat-container").appendChild(gui.domElement);

    const guiConnection = gui.addFolder("Connection");
    guiConnection.add(params.connection, "hostname").name("IP / hostname").onFinishChange(() => reconnect());
    guiConnection.add(params.connection, "port").min(0).step(1).onFinishChange(() => reconnect());
    
    gui.add(params, "mapName", [MAP_BLANK, "GDC1", "GDC2", "GDC3"]).onChange(
        value => viz.worldMap.loadAmrl(value));
}

function updatePoints(msg) {
    viz.pointCloud.setSize(msg.points.length);
    msg.points.forEach((p, i) => {
        viz.pointCloud.positions[i * 3 + 0] = p.point.x;
        viz.pointCloud.positions[i * 3 + 1] = p.point.y;
        viz.pointCloud.positions[i * 3 + 2] = 0;
    });
    viz.pointCloud.updatePositions();
}

function updateLaserScan(msg) {
    const nLaserPoints = msg.laser.ranges.length;
    const lasert0 = msg.laser.angle_min;
    const lasert1 = msg.laser.angle_max;
    viz.laserScan.setSize(nLaserPoints);
    for (let i = 0; i < nLaserPoints; ++i) {
        const theta = lasert0 + i / nLaserPoints * (lasert1 - lasert0);
        const r = msg.laser.ranges[i];
        viz.laserScan.positions[i * 3 + 0] = Math.cos(theta) * r;
        viz.laserScan.positions[i * 3 + 1] = Math.sin(theta) * r;
        viz.laserScan.positions[i * 3 + 2] = 0;
    }
    viz.laserScan.updatePositions();
}
