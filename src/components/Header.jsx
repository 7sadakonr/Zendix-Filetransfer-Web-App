import { Share2 } from 'lucide-react';
import StatusIndicator from './StatusIndicator';

const Header = () => {
    return (
        <header className="w-full max-w-4xl flex justify-between items-center mb-8 px-4">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
                    <Share2 size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white leading-tight">Zendix</h1>
                    <p className="text-xs text-gray-400">P2P Transfer</p>
                </div>
            </div>
            <StatusIndicator />
        </header>
    );
};

export default Header;
