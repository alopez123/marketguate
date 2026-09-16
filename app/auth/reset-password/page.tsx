export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import Link from 'next/link';

// Componente interno que usa useSearchParams
function ResetPasswordForm() {
  // ... tu lógica actual que utiliza useSearchParams() aquí ...
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-[#06b6d4]">Restablecer Contraseña</h1>
      {/* Tus inputs y formularios */}
    </div>
  );
}

// Componente principal de la página envuelto en Suspense
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
        <Suspense fallback={<div className="text-gray-400">Cargando...</div>}>
          <ResetPasswordForm />
        </Suspense>
        
        <div className="mt-6">
          <Link
            href="/"
            className="text-sm text-[#06b6d4] hover:underline"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}