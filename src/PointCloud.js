class PointCloud {
    constructor({material}={}) {
        this._containerSize = -1;
        this.geometry = new THREE.BufferGeometry();
        if (typeof material === "undefined") {
            this.material = new THREE.PointsMaterial({
                vertexColors: true,
                size: 5
            });
        }
        else {
            this.material = material;
        }
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;

        this.setSize(0);
    }

    get visible() {
        return this.points.visible;
    }

    set visible(v) {
        this.points.visible = v;
    }

    _expandBufferTo(n) {
        if (n <= this._containerSize)
            return;
        const itemSize = 3;
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(n * itemSize, itemSize));
        this.position = this.geometry.attributes.position;
        if (this.material.vertexColors) {
            this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(n * itemSize, itemSize));
            this.color = this.geometry.attributes.color;
        }
        this._containerSize = n;
    }

    setSize(n) {
        this._expandBufferTo(n);
        this.size = n;
        this.geometry.setDrawRange(0, n);
    }

    updatePositions() {
        this.geometry.attributes.position.needsUpdate = true;
        if (this.material.vertexColors)
            this.geometry.attributes.color.needsUpdate = true;
    }
}
