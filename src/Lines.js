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

    /**
     * Expand container to at least n*2 vertices
     * @param {Number} n number of lines (half the number of endpoints) 
     */
    _expandBufferTo(n) {
        if (n <= this._containerSize)
            return;
        const itemSize = 3;
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(n * 2 * itemSize, itemSize));
        this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(n * 2 * itemSize, itemSize));
        this.position = this.geometry.attributes.position;
        this.color = this.geometry.attributes.color;
        this._containerSize = n;
    }

    /**
     * Set the number of lines
     * @param {Number} n number of lines (half the number of endpoints)
     */
    setSize(n) {
        this._expandBufferTo(n);
        this.size = n;
        this.geometry.setDrawRange(0, n * 2);
    }

    updateAttributes() {
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
}
