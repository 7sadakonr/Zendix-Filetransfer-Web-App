import { Wifi, WifiOff } from 'lucide-react';
import useAppStore from '../stores/useAppStore';
import clsx from 'clsx';

const StatusIndicator = () => {
    const { connectionStatus } = useAppStore();

    const isConnected = connectionStatus === 'connected';
    const isConnecting = connectionStatus === 'connecting';

    return (
        <div className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            isConnected ? "bg-green-500/10 text-green-400" :
                isConnecting ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"
        )}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>
                {isConnected ? `Connected` :
                    isConnecting ? "Connecting..." : "Disconnected"}
            </span>
        </div>
    );
};

export default StatusIndicator;
