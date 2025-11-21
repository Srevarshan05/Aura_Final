const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

// 🌟 NEW: Import the serialport library 🌟
//const { SerialPort } = require('serialport'); 

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

// -------------------------------------------------------------
// 🌟 NEW: Port Listing and Broadcasting Logic 🌟
// -------------------------------------------------------------

/**
 * Lists available serial ports and broadcasts the list to all connected clients.
 */
//function broadcastPortsList() {
    //SerialPort.list().then(ports => {
       // const portPaths = ports.map(p => p.path);
        
        // Broadcast the updated list to ALL connected clients
        // The event name 'AVAILABLE_PORTS' is what the client listens for.
       // io.emit('AVAILABLE_PORTS', portPaths);
        
    //}).catch(err => {
        //console.error('Error listing ports:', err);
        // You can emit an error back to clients if needed:
        // io.emit('PORTS_LIST_ERROR', 'Failed to list ports on the server machine.');
   // });
//}

// Start broadcasting ports every 5 seconds (adjust interval as needed)
//setInterval(broadcastPortsList, 5000); 

// -------------------------------------------------------------
// 🌟 END NEW: Port Listing Logic 🌟
// -------------------------------------------------------------

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // Immediately send the current list of ports to the connecting client
    //broadcastPortsList(); 

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        // ... (existing JOIN logic - NO CHANGE) ...
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });
    
    // 🌟 NEW: UPLOAD CODE HANDLER 🌟
    socket.on('UPLOAD_CODE', ({ roomId, code, boardType, portName }) => {
        console.log(`[Upload Request] Room: ${roomId}, Port: ${portName}, Board: ${boardType}`);

        // --- REPLACE THIS WITH YOUR REAL ARDUINO FLASHING LOGIC ---
        // This is where you would call 'arduino-cli' or a similar tool
        // using a child process to compile 'code' and flash it to 'portName'.
        
        // Simulate a successful upload after a delay
        setTimeout(() => {
             // Broadcast the result back to everyone in the room
             io.to(roomId).emit('UPLOAD_RESULT', {
                 success: true,
                 message: `Upload complete to ${portName} (Arduino Uno) via server.`
             });
             // Optionally add a log to the terminal (if you have a terminal update action)
             // socket.to(roomId).emit('TERMINAL_LOG', 'Upload process finished.');
        }, 1500);
        // --------------------------------------------------------
    });

    socket.on('disconnecting', () => {
        // ... (existing disconnecting logic - NO CHANGE) ...
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Listening on port ${PORT}`));