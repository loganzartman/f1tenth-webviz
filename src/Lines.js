class Lines {
    constructor({material}={}) {
        this._containerSize = -1;
        this.geometry = new THREE.BufferGeometry();
        if (typeof(material) === "undefined") {
            this.material = new THREE.LineBasicMaterial({
                vertexColors: true
            });
        } else {
            this.material = material;
        }
        this.lines = new THREE.LineSegments(this.geometry, this.material);
        this.lines.frustumCulled = false;

        this.setSize(0);
    }

    get visible() {
        return this.lines.visible;
    }

    set visible(v) {
        this.lines.visible = v;
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
        this.position = this.geometry.attributes.position;
        if (this.material.vertexColors) {
            this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(n * 2 * itemSize, itemSize));
            this.color = this.geometry.attributes.color;
        }
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
        if (this.material.vertexColors)
            this.geometry.attributes.color.needsUpdate = true;
    }
}
