class DataParser {
    constructor(arrayBuffer) {
        this.header = {
            num_particles: 0,
            num_path_options: 0,
            num_points: 0,
            num_lines: 0,
            num_arcs: 0,
            num_laser_rays: 0,
            num_local_points: 0,
            num_local_lines: 0,
            num_local_arcs: 0,
            laser_min_angle: 0,
            laser_max_angle: 0,
            simulator_pose: { x: NaN, y: NaN, theta: NaN }
        };
        this.length = arrayBuffer.byteLength;
        this.remainingBytes = this.length;
        this.dataView = new DataView(arrayBuffer, 0);
        this.offset = 0;
        this.littleEndian = true;
        // The first 4 bytes are the encoded number '42'.
        // If the data is littleEndian the first byte should not be 0.
        if (arrayBuffer[0] === 0) {
            this.littleEndian = false;
        }
        this.offset += 4;
        this.remainingBytes -= 4;
    }
    
    readUint8() {
        let x = this.dataView.getUint8(this.offset, this.littleEndian);
        this.offset += 1;
        this.remainingBytes -= 1;
        return x;
    }
    
    readUint32() {
        let x = this.dataView.getUint32(this.offset, this.littleEndian);
        this.offset += 4;
        this.remainingBytes -= 4;
        return x;
    }
    
    readUint16() {
        let x = this.dataView.getUint16(this.offset, this.littleEndian);
        this.offset += 2;
        this.remainingBytes -= 2;
        return x;
    }
    
    readFloat32() {
        let x = this.dataView.getFloat32(this.offset, this.littleEndian);
        this.offset += 4;
        this.remainingBytes -= 4;
        return x;
    }
    
    readHeader() {
        this.header.num_particles = this.readUint32();
        this.header.num_path_options = this.readUint32();
        this.header.num_points = this.readUint32();
        this.header.num_lines = this.readUint32();
        this.header.num_arcs = this.readUint32();
        this.header.num_laser_rays = this.readUint32();
        this.header.num_local_points = this.readUint32();
        this.header.num_local_lines = this.readUint32();
        this.header.num_local_arcs = this.readUint32();
        this.header.laser_min_angle = this.readFloat32();
        this.header.laser_max_angle = this.readFloat32();
        this.header.simulator_pose = {
            x: this.readFloat32(),
            y: this.readFloat32(),
            theta: this.readFloat32()
        };
        return this.header;
    }
    
    readPose() {
        let pose = {
            x: 0,
            y: 0,
            theta: 0
        };
        pose.x = this.readFloat32();
        pose.y = this.readFloat32();
        pose.theta = this.readFloat32();
        return pose;
    }
    
    readPathVisualization() {
        let path = {
            curvature: 0,
            distance: 0,
            clearance: 0
        };
        path.curvature = this.readFloat32();
        path.distance = this.readFloat32();
        path.clearance = this.readFloat32();
        return path;
    }
    
    readMultiple(n, reader) {
        let arr = [];
        for (let i = 0; i < n; ++i) {
            arr.push(reader());
        }
        return arr;
    }
    
    readLaser() {
        let laser = {
            angle_min: this.header.laser_min_angle,
            angle_max: this.header.laser_max_angle,
            ranges: this.readMultiple(this.header.num_laser_rays, () => this.readUint16())
        }
        for (let i = 0; i < laser.ranges.length; ++i) {
            laser.ranges[i] = 0.001 * laser.ranges[i];
        }
        return laser;
    }
    
    readColor() {
        return this.readUint32();
    }
    
    readPoint2D() {
        return {
            x: this.readFloat32(),
            y: this.readFloat32()
        };
    }
    
    readPoint() {
        return {
            point: this.readPoint2D(),
            color: this.readColor()
        };
    }
    
    readLine() {
        return {
            p0: this.readPoint2D(),
            p1: this.readPoint2D(),
            color: this.readColor()
        };
    }
    
    readArc() {
        return {
            center: this.readPoint2D(),
            radius: this.readFloat32(),
            start_angle: this.readFloat32(),
            end_angle: this.readFloat32(),
            color: this.readColor()
        };
    }
    
    computeRobotPose(particles) {
        if (particles.length < 1) return undefined;
        let total = particles.reduce(
            function (cur_total, v) {
                cur_total.x += v.x / particles.length;
                cur_total.y += v.y / particles.length;
                cur_total.c += Math.cos(v.theta) / particles.length;
                cur_total.s += Math.sin(v.theta) / particles.length;
                return cur_total;
            },
            { x: 0, y: 0, c: 0, s: 0 }
        );
        let pose = {
            x: total.x,
            y: total.y,
            theta: Math.atan2(total.s, total.c)
        }
        return pose;
    }
    
    readMessage() {
        let message = {
            header: this.readHeader(),
            laser: this.readLaser(),
            particles: this.readMultiple(this.header.num_particles, () => this.readPose()),
            path_options: this.readMultiple(this.header.num_path_options, () => this.readPathVisualization()),
            points: this.readMultiple(this.header.num_points, () => this.readPoint()),
            lines: this.readMultiple(this.header.num_lines, () => this.readLine()),
            arcs: this.readMultiple(this.header.num_arcs, () => this.readArc()),
            robotPose: undefined
        };
        message.robotPose = this.computeRobotPose(message.particles);
        if (message.robotPose === undefined &&
            isFinite(message.header.simulator_pose.x) &&
            isFinite(message.header.simulator_pose.y) &&
            isFinite(message.header.simulator_pose.theta)) {
            message.robotPose = message.header.simulator_pose;
        }
        return message;
    }
}
