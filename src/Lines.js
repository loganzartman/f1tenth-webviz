class Lines {
    constructor() {
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
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(n * itemSize, itemSize));
        this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(n * itemSize, itemSize));
        this.position = this.geometry.attributes.position;
        this.color = this.geometry.attributes.color;
        this._containerSize = n;
    }

    setSize(n) {
        this._expandBufferTo(n);
        this.size = n;
        this.geometry.setDrawRange(0, n);
    }

    updateAttributes() {
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
}
