class Arcs {
    constructor({divisions=16}={}) {
        this._divisions = divisions;
        this._containerSize = -1;
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.LineBasicMaterial({
            vertexColors: true
        });
        this.lines = new THREE.LineSegments(this.geometry, this.material);
        this.lines.frustumCulled = false;

        this.setSize(0);
    }

    _expandBufferTo(n) {
        if (n <= this._containerSize)
            return;
        const itemSize = 3;
        const nSegments = n * this._divisions;
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(nSegments * itemSize, itemSize));
        this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(nSegments * itemSize, itemSize));
        this.position = this.geometry.attributes.position;
        this.color = this.geometry.attributes.color;
        this._containerSize = n;
    }

    setSize(n) {
        this._expandBufferTo(n);
        this.size = n;
        this.geometry.setDrawRange(0, n * this._divisions);
    }

    setArc(i, x, y, angle, radius, len, color) {
        const arc = new THREE.EllipseCurve(
            x + Math.cos(angle) * radius,
            y + Math.sin(angle) * radius,
            radius,
            radius,
            0,
        )
    }

    updateAttributes() {
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
}
