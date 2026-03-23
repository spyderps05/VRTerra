# WebXR GeoCollab - Operational Guide

## 1. Starting the Server
The GeoCollab server runs locally on this PC.
To start it:
1. Open PowerShell or Command Prompt.
2. Navigate to `f:\SWDEV\VRTerra\geocollab`.
3. Run `npm install -g pm2` (only needed once).
4. Run `pm2 start ecosystem.config.js`.
(The server will now run in the background).
To view logs, run `pm2 logs geocollab`.

## 2. Connecting the Headsets (Quest 3)
1. Ensure the Quest 3 headsets are connected to the same Wi-Fi network as the server PC.
2. For the first time only, the local CA certificate must be installed on the headset:
   - Use SideQuest or ADB to copy `certs\rootCA.crt` to the headset's Download folder.
   - On the headset, open Settings -> Security -> Install from storage and select the certificate.
3. Open the Meta Quest Browser.
4. Navigate to `https://<PC_LAN_IP>`. (Check the server terminal output for the IP, e.g., `https://192.168.1.14`).

## 3. VR Operations
- **Joining**: Click the "Enter VR" button in the bottom right of the browser window.
- **Movement**: Use the left controller joystick to move around the environment.
- **Communication**: WebRTC voice audio is automatically enabled when you enter the room. If prompted by the browser, allow microphone access.
- **Interactions**: Use the right controller trigger to interact with the briefing table and drop annotation pins (Laser Pointer).
- **Measurements & Markup**: The map handles marking via the raycaster. 

## Troubleshooting
- If "XR not supported", double check the certificate installation and ensure you are using `https://`.
- If avatars don't appear, refresh the page or ensure WebRTC constraints are met on the router (no client isolation).
