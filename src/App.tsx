import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Settings, Mic, MicOff } from "lucide-react";
import { SIPClient } from "./lib/sip-client";
import type { SIPConfig, ConnectionStatus } from "./types/sip";
import { cn } from "./lib/utils";
import { ThemeToggle } from "./components/ThemeToggle";

const DEFAULT_CONFIG: SIPConfig = {
  displayName: "",
  uri: "",
  authUsername: "",
  password: "",
  wsServer: "",
  stunServers: "stun:stun.l.google.com:19302",
};

function App() {
  const [config, setConfig] = useState<SIPConfig>(() => {
    const saved = localStorage.getItem("sip-config");
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [phoneNumber, setPhoneNumber] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [callState, setCallState] = useState<string>("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const sipClientRef = useRef<SIPClient | null>(null);

  useEffect(() => {
    // Auto-connect if config is complete
    if (config.wsServer && config.uri && config.password) {
      connectSIP();
    }

    return () => {
      sipClientRef.current?.disconnect();
    };
  }, []);

  const connectSIP = () => {
    if (sipClientRef.current) {
      sipClientRef.current.disconnect();
    }

    setConnectionStatus("connecting");

    const client = new SIPClient(
      config,
      (status) => {
        console.log("Connection status:", status);
        setConnectionStatus(status as ConnectionStatus);
      },
      (state, session) => {
        console.log("Call state:", state);
        setCallState(state);

        if (state === "incoming" && session) {
          const answer = window.confirm(`Incoming call. Answer?`);
          if (answer) {
            client.answer();
          } else {
            client.hangup();
          }
        }
      }
    );

    sipClientRef.current = client;
    client.connect();
  };

  const handleSaveSettings = () => {
    localStorage.setItem("sip-config", JSON.stringify(config));
    setShowSettings(false);
    connectSIP();
  };

  const handleCall = () => {
    if (!phoneNumber.trim()) {
      alert("Please enter a phone number");
      return;
    }

    try {
      sipClientRef.current?.call(phoneNumber);
      setCallState("calling");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to make call");
    }
  };

  const handleHangup = () => {
    sipClientRef.current?.hangup();
    setCallState("idle");
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute functionality
  };

  const isInCall = ["calling", "ringing", "answered", "incoming"].includes(
    callState
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Status Bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                connectionStatus === "registered" &&
                  "bg-green-500 animate-pulse",
                connectionStatus === "connected" && "bg-yellow-500",
                connectionStatus === "connecting" &&
                  "bg-blue-500 animate-pulse",
                connectionStatus === "disconnected" && "bg-gray-500",
                connectionStatus === "error" && "bg-red-500"
              )}
            />
            <span className="text-sm text-black dark:text-white capitalize">
              {connectionStatus}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg border border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              <Settings className="w-5 h-5 text-black dark:text-white" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-4 p-6 rounded-xl bg-white dark:bg-black border-2 border-black dark:border-white space-y-4">
            <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
              SIP Settings
            </h2>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={config.displayName}
                onChange={(e) =>
                  setConfig({ ...config, displayName: e.target.value })
                }
                className="w-full px-3 py-2 bg-white dark:bg-black border border-black dark:border-white rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                SIP URI
              </label>
              <input
                type="text"
                value={config.uri}
                onChange={(e) => setConfig({ ...config, uri: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-black border border-black dark:border-white rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sip:username@server.com"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Format: sip:username@server
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                Auth Username
              </label>
              <input
                type="text"
                value={config.authUsername}
                onChange={(e) =>
                  setConfig({ ...config, authUsername: e.target.value })
                }
                className="w-full px-3 py-2 bg-white dark:bg-black border border-black dark:border-white rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) =>
                  setConfig({ ...config, password: e.target.value })
                }
                className="w-full px-3 py-2 bg-white dark:bg-black border border-black dark:border-white rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                WebSocket Server
              </label>
              <input
                type="text"
                value={config.wsServer}
                onChange={(e) =>
                  setConfig({ ...config, wsServer: e.target.value })
                }
                className="w-full px-3 py-2 bg-white dark:bg-black border border-black dark:border-white rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="wss://server.com/ws"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Must include wss:// protocol
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                STUN/TURN Servers
              </label>
              <textarea
                value={config.stunServers}
                onChange={(e) =>
                  setConfig({ ...config, stunServers: e.target.value })
                }
                className="w-full px-3 py-2 bg-white dark:bg-black border border-black dark:border-white rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="stun:stun.l.google.com:19302"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2 px-4 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Save & Connect
            </button>
          </div>
        )}

        {/* Phone Interface */}
        <div className="p-8 rounded-xl bg-white dark:bg-black border-2 border-black dark:border-white">
          {/* Call Status */}
          <div className="text-center mb-6">
            <div className="text-sm text-black dark:text-white mb-2">
              {callState === "idle" && "Ready to call"}
              {callState === "calling" && "Calling..."}
              {callState === "ringing" && "Ringing..."}
              {callState === "answered" && "In call"}
              {callState === "incoming" && "Incoming call"}
              {callState === "ended" && "Call ended"}
              {callState === "failed" && "Call failed"}
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="mb-6">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isInCall}
              className="w-full px-4 py-3 bg-white dark:bg-black border border-black dark:border-white rounded-lg text-black dark:text-white text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Enter phone number"
            />
          </div>

          {/* Call Controls */}
          <div className="flex gap-4 justify-center">
            {!isInCall ? (
              <button
                onClick={handleCall}
                disabled={connectionStatus !== "registered"}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-full transition-colors"
              >
                <Phone className="w-5 h-5" />
                Call
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className="p-4 border-2 border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 text-black dark:text-white rounded-full transition-colors"
                >
                  {isMuted ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handleHangup}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full transition-colors"
                >
                  <PhoneOff className="w-5 h-5" />
                  Hang Up
                </button>
              </>
            )}
          </div>

          {/* Debug Info */}
          <div className="mt-6 p-4 border border-black dark:border-white rounded-lg">
            <div className="text-xs text-black dark:text-white space-y-1">
              <div>Status: {connectionStatus}</div>
              <div>Call State: {callState}</div>
              <div>
                Registered:{" "}
                {sipClientRef.current?.isRegistered() ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>React Phone</p>
        </div>
      </div>
    </div>
  );
}

export default App;
