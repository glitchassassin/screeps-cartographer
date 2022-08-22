# screeps-cartographer

Cartographer is an advanced (and open source) movement library for Screeps

## Testing Cartographer

Cartographer includes a super-minimal Screeps bot which will maintain a spawn and generate scouts to collect room intelligence. This allows roads to be generated and visualized for debugging purposes.

To run the test, simply run the build and copy the contents of `dist/main.js` to Screeps. If the scouts have mapped all the rooms they can reach, you can set `Memory.rooms = {}` to start them roaming again.
