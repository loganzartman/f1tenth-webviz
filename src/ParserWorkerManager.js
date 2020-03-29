let parserWorker;
let parserWorkerWorking = false;
const parserWorkerQueue = [];
const parserWorkerQueueMax = 8;

function parserEnqueue(arrayBuffer) {
    parserWorkerQueue.push(arrayBuffer);
    if (parserWorkerQueue.length > parserWorkerQueueMax)
        parserWorkerQueue.shift();
    parserDoWork();
}

function parserDoWork() {
    if (parserWorkerWorking)
        return;
    if (parserWorkerQueue.length === 0)
        return;
    parserWorkerWorking = true;
    const work = parserWorkerQueue.shift();
    parserWorker.postMessage(work, [work]);
}

function createParserWorker(workCallback) {
    parserWorker = new Worker("./src/ParserWorker.js");

    parserWorker.addEventListener("error", e => {
        parserWorkerWorking = false;
        console.error(e);
        parserDoWork();
    })

    parserWorker.addEventListener("message", e => {
        parserWorkerWorking = false;
        parserDoWork();
        const msg = e.data;
        workCallback(msg);
    });
}
