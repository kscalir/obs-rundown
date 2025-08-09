// OBS WebSocket integration service
const { OBSWebSocket } = require('obs-websocket-js');

const obs = new OBSWebSocket();

let isConnected = false;
let isConnecting = false;

async function connectOBS() {
  if (isConnected || isConnecting) return;
  isConnecting = true;
  try {
    const password = process.env.OBS_PASSWORD || undefined;
    await obs.connect('ws://127.0.0.1:4455', password, { rpcVersion: 1 });
    isConnected = true;
    console.log('Connected to OBS WebSocket');
    obs.on('ConnectionClosed', () => {
      isConnected = false;
      isConnecting = false;
      console.warn('OBS WebSocket connection closed');
    });
  } catch (err) {
    isConnected = false;
    isConnecting = false;
    console.error('OBS connection error:', err);
    throw err;
  }
}

async function getScenes() {
  await connectOBS();
  const { scenes, currentProgramSceneName } = await obs.call('GetSceneList');
  return { scenes, currentProgramSceneName };
}

async function getSourcesForScene(sceneName) {
  await connectOBS();
  const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
  return sceneItems;
}

module.exports = {
  connectOBS,
  getScenes,
  getSourcesForScene,
  obs
};
