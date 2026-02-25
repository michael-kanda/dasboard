// Test-Route für Streaming
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  console.log('[Test Stream] Route aufgerufen');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      console.log('[Test Stream] Stream gestartet');

      const testHTML = `
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
  <div class="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-6">
    <h3 class="text-lg font-bold text-indigo-900 mb-4">Test Stream - Spalte 1</h3>
    <p class="text-indigo-800">Wenn Sie diesen Text sehen, funktioniert das Streaming grundsätzlich!</p>
    <ul class="mt-4 space-y-2 text-sm text-indigo-700">
      <li>✅ Frontend fetch() funktioniert</li>
      <li>✅ Backend Stream wird erstellt</li>
      <li>✅ ReadableStream Reader funktioniert</li>
      <li>✅ UI Update funktioniert</li>
    </ul>
  </div>

  <div class="bg-surface rounded-2xl border border-theme-border-default p-6">
    <h3 class="text-lg font-bold text-heading mb-4">Test Stream - Spalte 2</h3>
    <p class="text-body">Dies ist ein einfacher Test ohne:</p>
    <ul class="mt-4 space-y-2 text-sm text-secondary">
      <li>❌ Keine Datenbank-Abfragen</li>
      <li>❌ Keine Google API Calls</li>
      <li>❌ Kein Gemini API Call</li>
      <li>✅ Nur reiner Text-Stream</li>
    </ul>
    <p class="mt-4 text-sm text-green-600 font-bold">Streaming funktioniert! 🎉</p>
  </div>
</div>
      `;

      // Simuliere Streaming: Sende den Text in Chunks
      const chunkSize = 50;
      for (let i = 0; i < testHTML.length; i += chunkSize) {
        const chunk = testHTML.substring(i, i + chunkSize);
        console.log('[Test Stream] Sende Chunk:', chunk.length, 'Zeichen');
        controller.enqueue(encoder.encode(chunk));

        // Kleine Verzögerung für sichtbares Streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log('[Test Stream] Stream abgeschlossen');
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
