import React from 'react';
import logo from "../assets/logo/lablaudo-logo.png";

export default function Logo({ textColor = "text-medical-primary", imgSize = "h-32" }: { textColor?: string, imgSize?: string }) {
    return (
        <div className="flex items-center gap-4 text-left">
            <div className="bg-white p-2 rounded-2xl shadow-md flex items-center justify-center overflow-hidden">
                <img
                    src={logo}
                    alt="LabLaudo Icon"
                    className={`${imgSize} w-auto object-contain`}
                    style={{ imageRendering: '-webkit-optimize-contrast' }}
                />
            </div>
            <div className="flex flex-col">
                <span className={`text-3xl font-extrabold tracking-tighter leading-none ${textColor}`}>
                    LabLaudo
                </span>
                <span className={`text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 ${textColor}`}>
                    Tecnologia Laboratorial
                </span>
            </div>
        </div>
    );
}
