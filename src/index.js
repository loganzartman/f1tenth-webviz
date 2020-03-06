const MAP_BLANK = "--blank--";
const LIDAR_OFFSET = 0.2;
const TIME_TRAVEL_LENGTH = 40;

const params = {
    paused: false,
    setPose: false,
    setNavGoal: false,
    followCar: false,
    connection: {
        hostname: "localhost",
        port: 10272
    },
    viz: {
        mapName: "GDC1",
        showLines: true,
        showPoints: true,
        showPaths: true,
        showParticles: true,
        showCrosshair: false
    },
    colors: {
        bg: 0x201819,
        pointCloud: 0x20dd80,
        laserScan: 0xdd8020,
        walls: 0x2080dd,
        pathOption: 0x606060,
        robot: 0xAAFFAA,
        phantomRobot: 0xFFAAAA,
        crosshair: 0xFFFFFF
    },
    timeTravel: {
        backward: 0
    }
};

const stats = {
    connected: false,
    mousePosNdc: new THREE.Vector3(0, 0),
    mousePosWorld: new THREE.Vector3(0, 0)
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
    setupPoseSetter();
    
    document.body.addEventListener("mousemove", event => {
        stats.mousePosNdc = screenToNdc(document.body, event.clientX, event.clientY);
    });

    (function f(){
        stats.mousePosWorld = stats.mousePosNdc.clone().unproject(viz.camera);
        updateCrosshair();
        requestAnimationFrame(f);
    })();
}
window.addEventListener("load", async () => onload(), false);

function screenToWorld(v) {
    const screenPos = new THREE.Vector3(
        -(v.x * 2 - 1), 
        -(v.y * 2 - 1),
        1.0
    );
    return screenPos.unproject(viz.camera);
}

function createHotkeys() {
    window.addEventListener("keydown", (event) => {
        if (event.key === " ") {
            params.paused = !params.paused;
        } else if (event.key === "p") { 
            setSettingPose(!params.setPose);
        } else if (event.key === "g") {
            setSettingNavGoal(!params.setNavGoal);
        } else if (event.key === "f") {
            params.followCar = !params.followCar;
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
    updateParticles(msg);
    if (params.followCar) {
        viz.controls.dragTarget.setX(msg.robotPose.x);
        viz.controls.dragTarget.setY(msg.robotPose.y);
    }
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

    gui.add(params, "paused").name("Pause [space]").listen();
    gui.add(params, "setPose").name("Set Pose [p]").listen().onChange(v => setSettingPose(v));
    gui.add(params, "setNavGoal").name("Set NavGoal [g]").listen().onChange(v => setSettingNavGoal(v));
    gui.add(params, "followCar").name("Follow Car [f]").listen();

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
    guiViz.add(params.viz, "showLines").onChange(v => viz.lines.visible = v);
    guiViz.add(params.viz, "showPoints").onChange(v => viz.pointCloud.visible = v);
    guiViz.add(params.viz, "showPaths").onChange(v => viz.pathOptions.visible = v);
    guiViz.add(params.viz, "showParticles").onChange(v => viz.particles.visible = v);
    guiViz.add(params.viz, "showCrosshair").onChange(v => viz.crosshair.visible = v);
    
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
    statWidget(stats, "mousePosWorld", statsContainer, pos => {
        const elem = document.createElement("div");
        elem.innerText = `x:${pos.x.toFixed(2).padStart(6, " ")} y:${pos.y.toFixed(2).padStart(6, " ")}`;
        elem.classList.add("status", "text-widget");
        return elem;
    });
}

function setSettingPose(b) {
    if (b) {
        setSettingNavGoal(false);
        params.setPose = true;
        viz.controls.enabled = false;
    } else {
        params.setPose = false;
        viz.controls.enabled = true;
    }
}

function setSettingNavGoal(b) {
    if (b) {
        setSettingPose(false);
        params.setNavGoal = true;
        viz.controls.enabled = false;
    } else {
        params.setNavGoal = false;
        viz.controls.enabled = true;
    }
}

function setupPoseSetter() {
    const el = viz.renderer.domElement;
    const dragStart = new THREE.Vector3();
    let dragging = false;
    let theta;

    el.addEventListener("mousedown", event => {
        if (!params.setPose && !params.setNavGoal)
            return;

        dragging = true;
        dragStart.copy(screenToNdc(el, event.clientX, event.clientY).unproject(viz.camera));
    });
    el.addEventListener("mouseup", event => {
        if (!params.setPose && !params.setNavGoal)
            return;

        dragging = false;
        viz.phantomPose.visible = false;

        if (params.setNavGoal) {
            setSettingNavGoal(false);
            socket.send(JSON.stringify({
                type: "set_nav_goal",
                x: dragStart.x,
                y: dragStart.y,
                theta: theta
            }));
        } else {
            setSettingPose(false);
            socket.send(JSON.stringify({
                type: "set_initial_pose",
                x: dragStart.x,
                y: dragStart.y,
                theta: theta
            }));
        }
    });
    el.addEventListener("mousemove", event => {
        if (!params.setPose && !params.setNavGoal)
            return;
        if (!dragging)
            return;

        const pos = screenToNdc(el, event.clientX, event.clientY).unproject(viz.camera);
        const dragDx = pos.clone().sub(dragStart);
        theta = Math.atan2(dragDx.y, dragDx.x);

        const pose = new THREE.Matrix4().makeTranslation(dragStart.x, dragStart.y, 0);
        pose.multiply(new THREE.Matrix4().makeRotationZ(theta));
        viz.phantomPose.visible = true;
        viz.phantomPose.matrixAutoUpdate = false;
        viz.phantomPose.matrix.copy(pose);
    });
}

/** 
 * convert clientX, clientY coordinates to normalized device coords 
 */
function screenToNdc(domElement, x, y) {
    const rect = domElement.getBoundingClientRect();
    return new THREE.Vector3(
        ((x - rect.x) / rect.width * 2 - 1),
        -((y - rect.y) / rect.height * 2 - 1),
        0
    );
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

function updateParticles(msg) {
    const transformation = new THREE.Matrix4();
    const rotation = new THREE.Matrix4();
    const point = new THREE.Vector4();
    viz.particles.setSize(msg.particles.length * ROBOT_TEMPLATE.length / 2);
    msg.particles.forEach((particle, i) => {
        transformation.makeTranslation(particle.x, particle.y, 0);
        transformation.multiply(rotation.makeRotationZ(particle.theta));
        ROBOT_TEMPLATE.forEach((p, j) => {
            point.set(p.x, p.y, p.z, 1.0);
            point.applyMatrix4(transformation);
            viz.particles.position.setXYZ(i * ROBOT_TEMPLATE.length + j, point.x, point.y, point.z);
        });
    });
    viz.particles.updateAttributes();
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

function updateCrosshair() {
    viz.crosshair.setSize(4);
    viz.crosshair.position.setXYZ(0, stats.mousePosNdc.x, -1, 0);
    viz.crosshair.position.setXYZ(1, stats.mousePosNdc.x, 1, 0);
    viz.crosshair.position.setXYZ(2, -1, stats.mousePosNdc.y, 0);
    viz.crosshair.position.setXYZ(3, 1, stats.mousePosNdc.y, 0);
    viz.crosshair.updateAttributes();
}
