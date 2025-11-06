import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A component that displays compilation and status logs from a socket connection,
 * and external HTTP execution output.
 * @param {{ socket: object, httpOutput: string }} props
 */
const Terminal = ({ socket, httpOutput }) => { // 👈 ACCEPT NEW PROP
    const [logs, setLogs] = useState([]);
    const terminalRef = useRef(null);

    /**
     * A memoized function to add a new log entry to the state.
     * (EXISTING LOGIC - NO CHANGE)
     */
    const addLog = useCallback((message, type = 'info') => {
        setLogs((prevLogs) => [
            ...prevLogs,
            { message, type, id: Date.now() + Math.random() },
        ]);
    }, []);

    /**
     * Effect to automatically scroll the terminal to the bottom when new logs are added.
     * (EXISTING LOGIC - NO CHANGE)
     */
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);
    
    /**
     * Effect to set up and tear down socket event listeners.
     * (EXISTING LOGIC - NO CHANGE)
     */
    useEffect(() => {
        if (!socket) return;

        // Handler for displaying the result of an Arduino code compilation
        const handleCompilationResult = (result) => {
            const timestamp = new Date().toLocaleTimeString();
            if (result.success) {
                addLog(`[${timestamp}] ✓ Compilation successful`, 'success');
                if (result.output) {
                    addLog(result.output, 'output');
                }
            } else {
                addLog(`[${timestamp}] ✗ Compilation failed`, 'error');
                addLog(result.errors, 'error');
            }
        };

        // Handler for displaying the compilation status from other users
        const handleCompilationStatus = (data) => {
            const timestamp = new Date(data.timestamp).toLocaleTimeString();
            addLog(`[${timestamp}] User compiled code: ${data.status}`, 'info');
        };

        // Register event listeners
        socket.on('compilation-result', handleCompilationResult);
        socket.on('compilation-status', handleCompilationStatus);

        // Cleanup: remove event listeners when the component unmounts
        return () => {
            socket.off('compilation-result', handleCompilationResult);
            socket.off('compilation-status', handleCompilationStatus);
        };
    }, [socket, addLog]);

    /**
     * Clears all logs from the terminal.
     * (EXISTING LOGIC - NO CHANGE)
     */
    const clearLogs = () => {
        setLogs([]);
        // Optional: Reset the HTTP output as well when clearing logs
        // This is done by emitting an event or calling a prop function, 
        // but since we cannot modify EditorPage.js's state from here directly, 
        // we'll rely on the parent component (EditorPage) to manage httpOutput.
    };

    return (
        <div className="terminal-container">
            <div className="terminal-header">
                {/* Updated title to reflect dual purpose */}
                <span>Arduino Output / C++ Runner</span> 
                <button onClick={clearLogs} className="clear-btn">
                    Clear
                </button>
            </div>
            <div className="terminal-content" ref={terminalRef}>
                {/* 🌟 CONDITIONAL RENDERING: Prioritize displaying the HTTP output if it has been set */}
                {httpOutput && httpOutput !== 'Terminal Ready.' ? (
                    <pre className="log-line http-output">
                        {httpOutput}
                    </pre>
                ) : (
                    // 👈 EXISTING SOCKET LOGIC DISPLAY (Only shown when no HTTP output is active)
                    <>
                        {logs.map((log) => (
                            <pre key={log.id} className={`log-line ${log.type}`}>
                                {log.message}
                            </pre>
                        ))}
                        {logs.length === 0 && (
                            <pre className="log-line info">
                                Terminal ready. Compile or upload your Arduino code to see output...
                            </pre>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Terminal;