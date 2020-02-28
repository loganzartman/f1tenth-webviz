const MAP_BLANK = "--blank--";
const LIDAR_OFFSET = 0.2;
const TIME_TRAVEL_LENGTH = 40;

const params = {
    paused: false,
    connection: {
        hostname: "localhost",
        port: 10272
    },
    viz: {
        mapName: "GDC1"
    },
    colors: {
        bg: 0x201819,
        pointCloud: 0x20dd80,
        laserScan: 0xdd8020,
        walls: 0x2080dd,
        pathOption: 0x606060,
        robot: 0xAAFFAA
    },
    timeTravel: {
        backward: 0
    }
};

const stats = {
    connected: false
};

let viz;
let socket;
let timeTravelBuffer = [];

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
        } else if (event.key === "ArrowLeft") {
            params.timeTravel.backward = Math.min(TIME_TRAVEL_LENGTH, params.timeTravel.backward + 1);
            updateTimeTravel();
        } else if (event.key === "ArrowRight") {
            params.timeTravel.backward = Math.max(0, params.timeTravel.backward - 1);
            updateTimeTravel();
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
        timeTravelBuffer.push(msg);
        timeTravelBuffer.splice(0, Math.max(0, timeTravelBuffer.length - TIME_TRAVEL_LENGTH));
        handleMessage(msg);
    });
    socket.addEventListener("open", _ => {stats.connected = true;});
    socket.addEventListener("close", _ => {stats.connected = false;});
}

function handleMessage(msg) {
    updatePoints(msg);
    updateLines(msg);
    updatePathOptions(msg);
    updateLaserScan(msg);
    updatePose(msg);
}

function updateTimeTravel() {
    if (!params.paused)
        return;
    const index = timeTravelBuffer.length - 1 - Math.min(params.timeTravel.backward, timeTravelBuffer.length - 1);
    handleMessage(timeTravelBuffer[index]); 
}

function buildGui() {
    const gui = new dat.GUI({autoPlace: false});
    document.getElementById("dat-container").appendChild(gui.domElement);
    gui.useLocalStorage = true;

    gui.add(params, "paused").listen();

    // connection
    gui.remember(params.connection);
    const guiConnection = gui.addFolder("Connection");
    guiConnection.add(params.connection, "hostname").name("IP / hostname").onFinishChange(() => reconnect());
    guiConnection.add(params.connection, "port").min(0).step(1).onFinishChange(() => reconnect());
    
    // visualization
    gui.remember(params.viz);
    const guiViz = gui.addFolder("Visualization");
    guiViz.add(params.viz, "mapName", [MAP_BLANK, "GDC1", "GDC2", "GDC3"]).onChange(
        value => viz.worldMap.loadAmrl(value));
    
    // time travel
    const guiTime = gui.addFolder("Time Travel");
    guiTime.addFolder("Works when paused.");
    guiTime.add(params.timeTravel, "backward").min(0).max(TIME_TRAVEL_LENGTH).step(1).listen().onChange(_ => updateTimeTravel());
    
    // invoke all change and finishChange behaviors at startup
    // TODO: can we avoid this?
    (function startup(g){
        for (let controller of g.__controllers) {
            if (typeof controller.__onChange !== "undefined")
                controller.__onChange(controller.getValue());
            if (typeof controller.__onFinishChange !== "undefined")
                controller.__onFinishChange(controller.getValue());
        }
        for (let folder in g.__folders)
            startup(g.__folders[folder]);
    })(gui);

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

function makeArc(curvature, distance) {
    const epsilon = 10e-6;
    const radius = Math.abs(1 / curvature);
    const angle = Math.min(2 * Math.PI, distance * Math.abs(curvature));
    if (curvature > epsilon) {
        return new THREE.EllipseCurve(
            0, radius, 
            radius, radius, 
            3/2*Math.PI, 3/2*Math.PI + angle, 
            false, 
            0
        );
    } else if (curvature < -epsilon) {
        return new THREE.EllipseCurve(
            0, -radius,
            radius, radius,
            1/2*Math.PI - angle, 1/2*Math.PI,
            false,
            0
        );
    } else {
        return new THREE.LineCurve(new THREE.Vector2(0, 0), new THREE.Vector2(distance, 0));
    }
}

function updatePose(msg) {
    const pose = getPoseMatrix4(msg);
    viz.robot.matrixAutoUpdate = false;
    viz.robot.matrix.copy(pose);
}

function updatePoints(msg) {
    const pose = getPoseMatrix4(msg);
    const pos = new THREE.Vector4();
    viz.pointCloud.setSize(msg.points.length);
    msg.points.forEach((p, i) => {
        pos.set(p.point.x, p.point.y, 0, 1);
        if (i < msg.header.num_local_points) {
            // point in robot coordinate frame
            pos.applyMatrix4(pose);
        }
        viz.pointCloud.position.setXYZ(i, pos.x, pos.y, 0);
    });
    viz.pointCloud.updatePositions();
}

function updateLines(msg) {
    const pose = getPoseMatrix4(msg);
    const a = new THREE.Vector4();
    const b = new THREE.Vector4();
    const color = new THREE.Color();
    viz.lines.setSize(msg.lines.length);
    msg.lines.forEach((l, i) => {
        const index = i * 2;
        color.set(l.color);

        a.set(l.p0.x, l.p0.y, 0, 1);
        b.set(l.p1.x, l.p1.y, 0, 1);

        if (i < msg.header.num_local_lines) {
            // line in robot coordinate frame
            a.applyMatrix4(pose);
            b.applyMatrix4(pose);
        }

        viz.lines.position.setXYZ(index, a.x, a.y, 0);
        viz.lines.color.setXYZ(index, color.r, color.g, color.b);

        viz.lines.position.setXYZ(index + 1, b.x, b.y, 0);
        viz.lines.color.setXYZ(index + 1, color.r, color.g, color.b);
    });
    viz.lines.updateAttributes();
}

function updatePathOptions(msg) {
    const divisions = 32;
    const pose = getPoseMatrix4(msg);
    const a = new THREE.Vector4();
    const b = new THREE.Vector4();
    const color = new THREE.Color(params.colors.pathOption);
    viz.pathOptions.setSize(msg.path_options.length * divisions);
    msg.path_options.forEach((o, i) => {
        const points = makeArc(o.curvature, o.distance).getPoints(divisions);

        for (let j = 0; j < points.length - 1; ++j) {
            const index = (i * divisions + j) * 2;

            // path options are always in robot coordinate frame
            a.set(points[j].x, points[j].y, 0, 1).applyMatrix4(pose);
            b.set(points[j+1].x, points[j+1].y, 0, 1).applyMatrix4(pose);

            viz.pathOptions.position.setXYZ(index, a.x, a.y, 0);
            viz.pathOptions.color.setXYZ(index, color.r, color.g, color.b);

            viz.pathOptions.position.setXYZ(index + 1, b.x, b.y, 0);
            viz.pathOptions.color.setXYZ(index + 1, color.r, color.g, color.b);
        }
    });
    viz.pathOptions.updateAttributes();
}

function updateLaserScan(msg) {
    const transform = getPoseMatrix4(msg)
        .multiply(new THREE.Matrix4().makeTranslation(LIDAR_OFFSET, 0, 0));
    const pos = new THREE.Vector4();
    const nLaserPoints = msg.laser.ranges.length;
    const lasert0 = msg.laser.angle_min;
    const lasert1 = msg.laser.angle_max;
    viz.laserScan.setSize(nLaserPoints);
    for (let i = 0; i < nLaserPoints; ++i) {
        const theta = lasert0 + i / nLaserPoints * (lasert1 - lasert0);
        const r = msg.laser.ranges[i];

        // laser scan points are always in robot coordinate frame
        pos.set(Math.cos(theta) * r, Math.sin(theta) * r, 0, 1).applyMatrix4(transform);
        viz.laserScan.position.setXYZ(i, pos.x, pos.y, pos.z);
    }
    viz.laserScan.updatePositions();
}
