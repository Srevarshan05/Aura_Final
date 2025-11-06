import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
// Import FaMagic for the AI button
import { FaPlay, FaArrowUp, FaCog, FaLaptopCode, FaCopy, FaSignOutAlt, FaMagic } from 'react-icons/fa';
import Avatar from 'react-avatar';

const ArduinoToolbar = ({
    socket,
    roomid,
    clients,
    onCopyRoomId,
    onLeaveRoom,
    onRunCode, // Existing C++ Runner prop
    onToggleAiModal // Prop to open the AI modal
}) => {
    const [selectedBoard, setSelectedBoard] = useState('uno');
    const [selectedPort, setSelectedPort] = useState('');
    const [isCompiling, setIsCompiling] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [availablePorts, setAvailablePorts] = useState([]);

    // --- Existing Arduino Compile Logic ---
    const handleCompile = () => {
        if (!socket) return;
        const code = document.querySelector('.CodeMirror').CodeMirror.getValue();
        setIsCompiling(true);
        setIsUploading(false); // Reset upload status
        socket.emit('compile-arduino', {
            code,
            boardType: selectedBoard,
            roomid: roomid,
        });
    };

    // --- Existing Upload Logic ---
    const handleUpload = () => {
        if (!socket) {
            toast.error("Socket not connected. Cannot upload.");
            return;
        }
        if (!selectedPort) {
            toast.error("Please select an Arduino port.");
            return;
        }
        if (!availablePorts.includes(selectedPort)) {
             toast.error(`Port ${selectedPort} is not currently available.`);
             return;
        }
        const code = document.querySelector('.CodeMirror').CodeMirror.getValue();
        setIsUploading(true);
        socket.emit('UPLOAD_CODE', {
            roomId: roomid,
            code: code,
            boardType: selectedBoard,
            portName: selectedPort,
        });
    };

    // --- Existing Serial Monitor Placeholder ---
    const openSerialMonitor = () => {
        alert('Serial Monitor functionality is pending!');
    };

    // --- Effect for listening to socket events ---
    useEffect(() => {
        if (!socket) return;

        const handlePortsUpdate = (ports) => {
            setAvailablePorts(ports || []);
            if (!selectedPort || !(ports || []).includes(selectedPort)) {
                setSelectedPort((ports && ports.length > 0) ? ports[0] : '');
            }
        };

        const handleUploadResult = (result) => {
            setIsUploading(false);
            if (result.success) {
                toast.success(result.message || 'Code upload successful!');
            } else {
                toast.error(result.message || 'Code upload failed.');
            }
        };

        const handleCompileResult = (result) => {
            setIsCompiling(false);
        };

        socket.on('AVAILABLE_PORTS', handlePortsUpdate);
        socket.on('UPLOAD_RESULT', handleUploadResult);
        socket.on('compilation-result', handleCompileResult);

        socket.emit('REQUEST_PORTS');

        return () => {
            socket.off('AVAILABLE_PORTS', handlePortsUpdate);
            socket.off('UPLOAD_RESULT', handleUploadResult);
            socket.off('compilation-result', handleCompileResult);
        };
    }, [socket, selectedPort]);

    return (
        <div className="arduino-toolbar">
            <div className="toolbar-title">Aura Sync Cloud IDE</div>

            {/* Left Buttons */}
            <div className="toolbar-group">
                <button
                    className="toolbar-button icon-button"
                    onClick={handleCompile}
                    disabled={isCompiling || isUploading}
                    title="Compile (Arduino)"
                >
                    <FaPlay />
                    <span>{isCompiling ? 'Compiling...' : 'Compile'}</span>
                </button>

                <button
                    className="toolbar-button icon-button run-cpp-button"
                    onClick={onRunCode}
                    disabled={isCompiling || isUploading}
                    title="Run C++ Code (via Secure Runner)"
                >
                    <FaPlay style={{ color: '#50fa7b' }} />
                    <span>Run C++</span>
                </button>

                <button
                    className="toolbar-button icon-button"
                    onClick={handleUpload}
                    disabled={isUploading || !selectedPort || isCompiling}
                    title="Upload to Arduino"
                >
                    <FaArrowUp />
                    <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                </button>
            </div>

            {/* Middle Selectors */}
            <div className="toolbar-group">
                <div className="select-group">
                    <select
                        id="board-select"
                        value={selectedBoard}
                        onChange={(e) => setSelectedBoard(e.target.value)}
                    >
                        <option value="uno">Arduino Uno</option>
                        <option value="nano">Arduino Nano</option>
                        <option value="mega">Arduino Mega</option>
                    </select>
                </div>
                <div className="select-group">
                    <select
                        id="port-select"
                        value={selectedPort}
                        onChange={(e) => setSelectedPort(e.target.value)}
                        disabled={availablePorts.length === 0}
                    >
                        <option value="" disabled>
                            {availablePorts.length === 0 ? 'No Ports Found' : 'Select Port'}
                        </option>
                        {availablePorts.map(portName => (
                            <option key={portName} value={portName}>
                                {portName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Right Buttons & Info */}
            <div className="toolbar-group toolbar-right">

                {/* --- AI Button Added Here --- */}
                <button
                    className="toolbar-button icon-button-only ai-button"
                    onClick={onToggleAiModal} // Calls the function from EditorPage
                    title="Generate Code with AI"
                >
                    <FaMagic />
                </button>
                {/* --- End AI Button --- */}

                <button
                    className="toolbar-button icon-button-only"
                    onClick={openSerialMonitor}
                    title="Serial Monitor"
                >
                    <FaLaptopCode />
                </button>
                <div className="toolbar-clients">
                    {clients && clients.map((client) => (
                        <Avatar
                            key={client.socketId}
                            name={client.username}
                            size="40"
                            round="10px"
                            className="avatar"
                            title={client.username}
                        />
                    ))}
                </div>
                <button
                    className="toolbar-button icon-button"
                    onClick={onCopyRoomId}
                >
                    <FaCopy />
                    <span>Copy ID</span>
                </button>
                <button
                    className="toolbar-button icon-button leaveBtn-toolbar"
                    onClick={onLeaveRoom}
                >
                    <FaSignOutAlt />
                    <span>Leave</span>
                </button>
            </div>
        </div>
    );
};

export default ArduinoToolbar;