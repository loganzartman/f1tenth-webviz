class CameraControls {
    maxZoom = 3;
    minZoom = 0.005;
    zoomRate = 0.001;
    down = false;
    dragPos = new THREE.Vector3();

    lastUpdateTime = Date.now();
    interpolationTime = 0.05;
    dragTarget = new THREE.Vector3();
    zoomTarget = 0;

    constructor(camera, domTarget = document.body) {
        this.camera = camera;
        this.domTarget = domTarget;
        this.domTarget.addEventListener("mousemove", event => this.mouseMove(event));
        this.domTarget.addEventListener("mousedown", event => this.mouseDown(event));
        this.domTarget.addEventListener("mouseup", event => this.mouseUp(event));
        this.domTarget.addEventListener("wheel", event => this.wheel(event));
        this.zoomTarget = this.camera.zoom;
        this.update();
    }

    /** 
     * convert clientX, clientY coordinates to normalized device coords 
     */
    screenToNdc(x, y) {
        const rect = this.domTarget.getBoundingClientRect();
        return new THREE.Vector3(
            (x - rect.x) / rect.width * 2 - 1,
            (y - rect.y) / rect.height * 2 - 1,
            1
        );
    }

    update() {
        const dt = (Date.now() - this.lastUpdateTime) / 1000.0;
        this.lastUpdateTime = Date.now();

        this.camera.position.add(this.dragTarget.clone().sub(this.camera.position)
            .multiplyScalar((1 / this.interpolationTime) * dt));
        this.camera.zoom += (this.zoomTarget - this.camera.zoom) * (1 / this.interpolationTime) * dt;
        requestAnimationFrame(() => this.update());
    }

    mouseDown(event) {
        this.dragPos = this.screenToNdc(event.clientX, event.clientY);
        this.down = true;
        event.preventDefault();
    }

    mouseUp(event) {
        this.down = false;
        event.preventDefault();
    }

    mouseMove(event) {
        if (!this.down)
            return;
        const dragDx = this.screenToNdc(event.clientX, event.clientY)
            .unproject(this.camera)
            .sub(this.dragPos.clone().unproject(this.camera))
            .multiply(new THREE.Vector3(-1, 1, 1));
        console.log(this.dragPos);

        this.dragTarget.add(dragDx);
        this.dragPos.copy(this.screenToNdc(event.clientX, event.clientY));
        event.preventDefault();
    }
    
    wheel(event) {
        this.zoomTarget = Math.max(this.minZoom, Math.min(this.maxZoom,
            this.zoomTarget * (1 + event.deltaY * -this.zoomRate)));
        event.preventDefault();
    }
}
