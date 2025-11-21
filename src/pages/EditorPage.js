import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client'; // Assuming Client is still needed for sidebar logic later if desired
import Editor from '../components/Editor';
import ArduinoToolbar from '../components/ArduinoToolbar';
import Terminal from '../components/Terminal';
import AiCodeGenerator from '../components/AiCodeGenerator'; // Import the new component
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    // --- Existing State and Refs ---
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [httpOutput, setHttpOutput] = useState('Terminal Ready.');
    const [terminalHeight, setTerminalHeight] = useState(25);
    const isResizing = useRef(false);

    // --- State for AI Modal ---
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    // -------------------------

    // --- Existing Resizing Logic ---
    const handleMouseDown = (e) => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };
    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current) return;
        const newHeight = (window.innerHeight - e.clientY) / window.innerHeight * 100;
        if (newHeight > 10 && newHeight < 80) {
            setTerminalHeight(newHeight);
        }
    }, []);
    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    // --- Existing C++ Execution Function ---
    async function onRunCode() {
        const codeToExecute = codeRef.current;
        if (!codeToExecute) {
            toast.error('No code to execute.');
            return;
        }
        const payloadObject = { code: codeToExecute };
        const jsonPayloadString = JSON.stringify(payloadObject);
        console.log("--- Code Execution Payload Generated ---");
        console.log("Final JSON String (HTTP Body):", jsonPayloadString);
        console.log("---------------------------------------");
        const endpoint = 'https://a9455782b7c4.ngrok-free.app/execute'; // Your Ngrok URL
        setHttpOutput('External C++ Runner: Compiling and running code... Please wait.');
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonPayloadString,
            });
            const result = await response.json();
            if (response.ok) {
                const outputText = result.stdout || result.output || JSON.stringify(result, null, 2);
                setHttpOutput(`[HTTP Runner SUCCESS] Output:\n${outputText}`);
            } else {
                const errorText = result.stderr || result.error || JSON.stringify(result, null, 2);
                setHttpOutput(`[HTTP Runner FAILED] Error:\n${errorText}`);
                toast.error('Code execution failed. Check terminal for details.');
            }
        } catch (error) {
            console.error('API execution error:', error);
            setHttpOutput(`[HTTP Runner ERROR] Network Error: Failed to connect.\nDetails: ${error.message}`);
            toast.error('Could not reach the execution server.');
        }
    }

    // --- Existing Socket Connection Logic ---
    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
        };
        init();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
            }
             // Clean up mouse listeners for resizer
             document.removeEventListener('mousemove', handleMouseMove);
             document.removeEventListener('mouseup', handleMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Keep dependencies minimal for socket init

    // --- Existing Copy and Leave Functions ---
    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }
    function leaveRoom() {
        reactNavigator('/');
    }

    // --- Function to toggle AI Modal ---
    const toggleAiModal = () => {
        setIsAiModalOpen(!isAiModalOpen);
    };
    // ---------------------------------


    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="ide-container">
            {/* Pass the toggle function to the toolbar */}
            <ArduinoToolbar
                socket={socketRef.current}
                roomid={roomId}
                clients={clients}
                onCopyRoomId={copyRoomId}
                onLeaveRoom={leaveRoom}
                onRunCode={onRunCode}
                onToggleAiModal={toggleAiModal} // Prop is now passed correctly
            />

            <div className="editor-and-terminal-wrap">
                <div className="editorWrap">
                    <Editor
                        socketRef={socketRef}
                        roomId={roomId}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                        }}
                    />
                </div>
                <div className="resizer" onMouseDown={handleMouseDown}></div>
                <div className="terminalWrap" style={{ height: `${terminalHeight}vh` }}>
                     <Terminal
                        socket={socketRef.current}
                        roomid={roomId} // Pass roomid if Terminal needs it
                        httpOutput={httpOutput} // Pass httpOutput
                    />
                </div>
            </div>

            {/* Render the AI Modal Conditionally */}
            <AiCodeGenerator isOpen={isAiModalOpen} onClose={toggleAiModal} />
        </div>
    );
};

export default EditorPage;