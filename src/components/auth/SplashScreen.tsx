import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 4500);
    const endTimer = setTimeout(onFinish, 5000);
    return () => { clearTimeout(fadeTimer); clearTimeout(endTimer); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#4fc3f7] cursor-pointer overflow-hidden transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
      onClick={onFinish}
    >
      <img
        src="/splash-logo.png"
        alt="Viação Progresso"
        className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain animate-fade-in drop-shadow-2xl"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/progresso-logo.png'; }}
      />
    </div>
  );
}
