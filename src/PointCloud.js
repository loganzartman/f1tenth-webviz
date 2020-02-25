class PointCloud {
    constructor({color=Colors.pointCloud}={}) {
        this._containerSize = -1;
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.PointsMaterial({
            color: color,
            size: 5
        });
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;

        this.setSize(0);
    }

    _expandBufferTo(n) {
        if (n <= this._containerSize)
            return;
        const itemSize = 3;
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(n * itemSize, itemSize));
        this.position = this.geometry.attributes.position;
        this._containerSize = n;
    }

    setSize(n) {
        this._expandBufferTo(n);
        this.size = n;
        this.geometry.setDrawRange(0, n);
    }

    updatePositions() {
        this.geometry.attributes.position.needsUpdate = true;
    }
}
