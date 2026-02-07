


const Ring = ({ percentage, color, radius, stroke }: any) => {
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center">
            <svg
                height={radius * 2}
                width={radius * 2}
                className="transform -rotate-90"
            >
                <circle
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={stroke}
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke={color}
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
                    strokeLinecap="round"
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
            </svg>
        </div>
    );
};

export default function ActivityRings() {
    return (
        <div className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center h-full">
            <h3 className="text-lg font-semibold text-white mb-4 w-full text-left">Activity</h3>

            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Outer Ring - Scripts */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Ring percentage={75} color="#FF9500" radius={90} stroke={12} />
                </div>

                {/* Middle Ring - Captions */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Ring percentage={45} color="#30D158" radius={72} stroke={12} />
                </div>

                {/* Inner Ring - Thumbnails */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Ring percentage={60} color="#0A84FF" radius={54} stroke={12} />
                </div>

                {/* Center Text */}
                <div className="text-center z-10">
                    <span className="block text-3xl font-bold text-white">12</span>
                    <span className="text-xs text-text-tertiary">Projects</span>
                </div>
            </div>

            <div className="mt-6 w-full space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-accent mr-2" />
                        <span className="text-text-secondary">Scripts</span>
                    </div>
                    <span className="text-white font-medium">8/10</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-success mr-2" />
                        <span className="text-text-secondary">Captions</span>
                    </div>
                    <span className="text-white font-medium">45m</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-info mr-2" />
                        <span className="text-text-secondary">Thumbnails</span>
                    </div>
                    <span className="text-white font-medium">4</span>
                </div>
            </div>
        </div>
    );
}
