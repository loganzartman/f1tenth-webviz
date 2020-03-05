class CameraControls {
    down = false;
    dragPos = new THREE.Vector3();
    velocity = new THREE.Vector3();

    constructor(camera, domTarget = document.body) {
        this.camera = camera;
        this.domTarget = domTarget;
        this.domTarget.addEventListener("mousemove", event => this.mouseMove(event));
        this.domTarget.addEventListener("mousedown", event => this.mouseDown(event));
        this.domTarget.addEventListener("mouseup", event => this.mouseUp(event));
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

        this.camera.position.add(dragDx);
        this.dragPos.copy(this.screenToNdc(event.clientX, event.clientY));
        event.preventDefault();
    }
}
