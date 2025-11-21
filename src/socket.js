// src/socket.js - CORRECTED FINAL VERSION

import { io } from 'socket.io-client';

export const initSocket = async () => {
    // 🌟 Ensure the connection uses the public ngrok URL. 🌟
    // This is the variable that holds your public HTTPS address.
    const PUBLIC_URL = process.env.REACT_APP_WEBSOCKET_URL; 

    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    
    // Use the public URL. If the env variable is somehow not read, 
    // it might still fail, but this targets the correct variable.
    return io(PUBLIC_URL, options);
};