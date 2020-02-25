class PointCloud {
    constructor({color=Colors.pointCloud}={}) {
        this.positions = new Float32Array();
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
        const nComponents = n * 3;
        if (nComponents <= this.positions.length)
            return;
        this.positions = new Float32Array(nComponents);
        this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
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
