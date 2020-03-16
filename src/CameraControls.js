class CameraControls {
    enabled = true;
    maxZoom = 3;
    minZoom = 0.005;
    zoomRate = 0.001;
    down = false;
    dragPos = new THREE.Vector3();

    lastUpdateTime = Date.now();
    interpolationTime = 0.1;
    dragTarget = new THREE.Vector3();
    zoomTarget = 0;

    constructor(camera, domElement = document.body) {
        this.camera = camera;
        this.domElement = domElement;
        this.domElement.addEventListener("mousemove", event => this.mouseMove(event));
        this.domElement.addEventListener("mousedown", event => this.mouseDown(event));
        this.domElement.addEventListener("mouseup", event => this.mouseUp(event));
        this.domElement.addEventListener("wheel", event => this.wheel(event));
        this.zoomTarget = this.camera.zoom;
        this.update();
    }

    update() {
        requestAnimationFrame(() => this.update());
        const dt = (Date.now() - this.lastUpdateTime) / 1000.0;
        this.lastUpdateTime = Date.now();

        this.camera.position.add(this.dragTarget.clone().sub(this.camera.position)
            .multiplyScalar((1 / this.interpolationTime) * dt));
        this.camera.zoom += (this.zoomTarget - this.camera.zoom) * (1 / this.interpolationTime) * dt;
    }

    mouseDown(event) {
        if (!this.enabled)
            return;

        this.dragPos = screenToNdc(this.domElement, event.clientX, event.clientY);
        this.down = true;
    }

    mouseUp(event) {
        this.down = false;
        event.preventDefault();
    }

    mouseMove(event) {
        if (!this.enabled)
            return;
        if (!this.down)
            return;

        const dragDx = screenToNdc(this.domElement, event.clientX, event.clientY)
            .unproject(this.camera)
            .sub(this.dragPos.clone().unproject(this.camera))
            .multiply(new THREE.Vector3(-1, -1, 1));

        this.dragTarget.add(dragDx);
        this.dragPos.copy(screenToNdc(this.domElement, event.clientX, event.clientY));
        event.preventDefault();
    }
    
    wheel(event) {
        if (!this.enabled)
            return;

        this.zoomTarget = Math.max(this.minZoom, Math.min(this.maxZoom,
            this.zoomTarget * (1 + event.deltaY * -this.zoomRate)));
        event.preventDefault();
    }
}
