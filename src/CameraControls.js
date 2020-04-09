class CameraControls {
    enabled = true;
    maxZoom = 3;
    minZoom = 0.005;
    zoomRate = 0.1;
    down = false;
    dragPos = new THREE.Vector3();

    lastUpdateTime = Date.now();
    interpolationTime = 0.1;
    dragTarget = new THREE.Vector3();
    zoomTarget = 0;

    touchPosStart = null;
    touchDistStart = null;

    constructor(camera, domElement = document.body) {
        this.camera = camera;
        this.domElement = domElement;
        this.domElement.addEventListener("mousemove", event => this.mouseMove(event));
        this.domElement.addEventListener("mousedown", event => this.mouseDown(event));
        this.domElement.addEventListener("mouseup", event => this.mouseUp(event));
        this.domElement.addEventListener("wheel", event => this.wheel(event));
        this.domElement.addEventListener("touchmove", event => this.touchMove(event));
        this.domElement.addEventListener("touchstart", event => this.touchStart(event));
        this.domElement.addEventListener("touchend", event => this.touchEnd(event));
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
            this.zoomTarget * (1 - Math.sign(event.deltaY) * this.zoomRate)));
        event.preventDefault();
    }

    computeTouchMeanNdc(touches) {
        return touches
            .reduce((pos, touch) => pos.add(screenToNdc(this.domElement, touch.clientX, touch.clientY)), new THREE.Vector3())
            .divideScalar(touches.length);
    }

    computeMaxTouchDist(touches) {
        const touch0 = screenToNdc(this.domElement, touches[0].clientX, touches[0].clientY);
        return touches
            .reduce((max, touch) => Math.max(
                max, 
                screenToNdc(this.domElement, touch.clientX, touch.clientY).sub(touch0).length()
            ), 0);
    }

    touchStart(event) {
        if (!this.enabled)
            return;
        
        this.down = true;

        const touches = Array.from(event.targetTouches);
        this.touchPosStart = this.computeTouchMeanNdc(touches);

        if (event.targetTouches.length > 1) {
            this.touchDistStart = this.computeMaxTouchDist(touches);
        }
    }

    touchEnd(event) {
        if (event.targetTouches.length === 0) {
            this.down = false;
            this.touchPosStart = null;
            this.touchDistStart = null;
        } else {
            const touches = Array.from(event.targetTouches);
            this.touchPosStart = this.computeTouchMeanNdc(touches);
            this.touchDistStart = this.computeMaxTouchDist(touches);
        }

        event.preventDefault();
    }
    
    touchMove(event) {
        if (!this.enabled)
            return;
        if (!this.down)
            return;
        if (event.target !== this.domElement)
            return;
        
        const touches = Array.from(event.targetTouches);
        const touchMean = this.computeTouchMeanNdc(touches);
        const maxTouchDist = this.computeMaxTouchDist(touches); 
        
        const touchDx = touchMean.clone().unproject(this.camera).sub(this.touchPosStart.clone().unproject(this.camera));
        const touchDzoom = (maxTouchDist - this.touchDistStart) * this.zoomRate;
        this.dragTarget.sub(touchDx);
        this.zoomTarget += touchDzoom;

        this.touchPosStart.copy(touchMean);
        this.touchDistStart = maxTouchDist;
        event.preventDefault();
    }
}
