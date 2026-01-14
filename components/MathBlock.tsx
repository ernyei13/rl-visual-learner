import React from 'react';

interface MathBlockProps {
    title: string;
    description: string;
    formula: React.ReactNode;
}

const MathBlock: React.FC<MathBlockProps> = ({ title, description, formula }) => {
    return (
        <div className="border-2 border-neutral-900 p-4 mb-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-bold text-lg mb-2 border-b-2 border-neutral-200 pb-1">{title}</h3>
            <div className="font-mono text-sm md:text-base bg-neutral-100 p-3 rounded mb-2 overflow-x-auto whitespace-nowrap">
                {formula}
            </div>
            <p className="text-sm text-neutral-600 italic">
                {description}
            </p>
        </div>
    );
};

export default MathBlock;