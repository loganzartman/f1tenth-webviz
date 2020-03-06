# Logan's f1tenth-webviz

*A reimplementation of UT AMRL's [web_rviz][web_rviz] used for the F1/10th Robotics Course*

## Running

1. Clone the repository
2. Run `npm install` or `yarn install` once to fetch dependencies
3. No building needed! Open `index.html` to start using

## Usage

* Automatically connects and reconnects to a [web_rviz server](server)
    * Change address in "Connection" settings
* Click and drag to pan, scroll to zoom
* Check "paused" (hotkey: `p`) to freeze the last frame of visualization received from the server
    * Use **"Time Travel"** menu to look at previous frames
    * Backward hotkey: `left arrow`
    * Forward hotkey: `right arrow`
* Check "Set Pose" or "Set NavGoal" to send a new pose or nav goal to the server
    * When setting, click and drag on the map to choose a point and direction

## Tips and Tricks

* Robot pose is computed as mean pose of all particles if any particles are visualized
    * In simulation, if no particles are sent, the real pose is used instead
    * On the real robot, the robot will remain at the origin if no particles are sent
* The last Path Option to be visualized is considered the "best"
    * This one is highlighted and its clearance is displayed
    * Other path options are color-coded based on their clearance values
    * Use the clearance value for non-best paths to visualize any quantity you want

[server]: https://github.com/ut-amrl/f1tenth_course/tree/master/src/websocket
[web_rviz]: https://github.com/ut-amrl/f1tenth_course/blob/master/web_rviz.html
