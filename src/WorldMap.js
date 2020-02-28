class WorldMap {
    constructor() {
        this.geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: params.colors.walls,
            linewidth: 1
        });
        this.lines = new THREE.LineSegments(this.geometry, material);
    }
    
    async loadAmrl(name) {
        if (name === MAP_BLANK) {
            this.updateFromSegments([]);
            return;
        }
        const url = `http://amrl.cs.utexas.edu/f1tenth_course/maps/${name}.json`;
        const result = await fetch(url);
        const data = await result.json();
        this.updateFromSegments(data);
    }

    updateFromSegments(segments) {
        this.geometry.setFromPoints(segments.flatMap(s => {
            return [
                new THREE.Vector3(s.p0.x, s.p0.y),
                new THREE.Vector3(s.p1.x, s.p1.y),
            ];
        }));
    }
}
