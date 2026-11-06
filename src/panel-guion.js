// Panel para editar el guion desde la página (sin tocar el JSON a mano).
// Lee guiones/<id>.json, muestra los campos de cada línea y al guardar los envía al servidor
// (POST /api/guion/<id>), que los escribe en el archivo y lanza la construcción automática.

const MIRADAS = [
  ['auto', 'Automática'],
  ['camara', 'A la cámara'],
  ['companero', 'Al compañero'],
  ['pensando', 'Pensando (ojos sueltos)'],
];
const PLANOS_BASE = ['WIDE', 'SAMARIO', 'CUP'];

// Abre el panel. Devuelve una promesa con 'guardado' o 'cancelado' cuando se cierra.
export async function abrirPanel(id) {
  const guion = await (await fetch(`/guiones/${id}.json`, { cache: 'no-store' })).json();
  const planos = [...PLANOS_BASE, ...Object.keys(guion.planos || {})];

  const panel = document.createElement('div');
  panel.id = 'panel-guion';
  panel.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:390px;z-index:20;background:#1b1612;' +
    'color:#f1e7da;font:13px sans-serif;display:flex;flex-direction:column;box-shadow:-4px 0 18px #0008';
  panel.innerHTML = `
    <div style="padding:10px 14px;font-weight:bold;border-bottom:1px solid #4a3d31">
      Editar guion: ${guion.titulo || id}
      <div style="font-weight:normal;font-size:11px;opacity:.7;margin-top:2px">
        Cambiar un texto regenera su voz (≈1 min). El resto solo reconstruye el audio.</div>
    </div>
    <div class="lineas" style="flex:1;overflow-y:auto;padding:8px 14px"></div>
    <div style="padding:10px 14px;border-top:1px solid #4a3d31;display:flex;gap:8px;align-items:center">
      <button class="guardar" style="flex:1;padding:8px;cursor:pointer">💾 Guardar</button>
      <button class="cancelar" style="flex:1;padding:8px;cursor:pointer">Cancelar</button>
    </div>
    <div class="aviso" style="padding:0 14px 8px;color:#ff9b8a;font-size:12px;min-height:14px"></div>`;
  const cont = panel.querySelector('.lineas');
  const estilo = 'background:#2a221b;color:#f1e7da;border:1px solid #4a3d31;border-radius:4px;padding:3px;';

  const filas = guion.lineas.map((l, i) => {
    const cam = l.camara;
    const simple = typeof cam === 'string' ? cam : '';
    const personalizada = cam !== undefined && typeof cam !== 'string';
    const caja = document.createElement('div');
    caja.style.cssText = 'margin:8px 0;padding:8px;background:#241d17;border-radius:6px';
    caja.innerHTML = `
      <div style="margin-bottom:4px"><b>${i + 1}</b> · ${l.personaje}</div>
      <textarea rows="2" style="width:100%;box-sizing:border-box;${estilo}">${(l.texto || '').replace(/</g, '&lt;')}</textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
        <label>Mirada<select class="mirada" style="width:100%;${estilo}">
          ${MIRADAS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
        <label>Plano<select class="plano" style="width:100%;${estilo}">
          <option value="">${personalizada ? '(personalizada)' : '(sin cambio)'}</option>
          ${planos.map(p => `<option>${p}</option>`).join('')}</select></label>
        <label>Pausa antes (s)<input class="pausa" type="number" min="0" step="0.05" style="width:100%;box-sizing:border-box;${estilo}"></label>
        <label>Solapar (s)<input class="solapar" type="number" min="0" step="0.05" style="width:100%;box-sizing:border-box;${estilo}"></label>
      </div>`;
    caja.querySelector('.mirada').value = l.mirada || 'auto';
    caja.querySelector('.plano').value = simple;
    caja.querySelector('.pausa').value = l.pausa ?? 0;
    caja.querySelector('.solapar').value = l.solapar ?? 0;
    cont.appendChild(caja);
    return caja;
  });

  document.body.appendChild(panel);

  return new Promise(resolve => {
    const cerrar = (res) => { panel.remove(); resolve(res); };
    panel.querySelector('.cancelar').onclick = () => cerrar('cancelado');
    panel.querySelector('.guardar').onclick = async () => {
      const lineas = filas.map(c => ({
        texto: c.querySelector('textarea').value,
        mirada: c.querySelector('.mirada').value,
        pausa: parseFloat(c.querySelector('.pausa').value) || 0,
        solapar: parseFloat(c.querySelector('.solapar').value) || 0,
        camara: c.querySelector('.plano').value || null,   // null = no tocar
      }));
      const aviso = panel.querySelector('.aviso');
      try {
        const r = await fetch(`/api/guion/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineas }),
        });
        let dato;
        try {
          dato = await r.json();
        } catch {
          aviso.textContent = 'El servidor no entiende el guardado (está desactualizado). ' +
            'Páralo con Ctrl+C y vuelve a ejecutar: python scripts/servidor.py';
          return;
        }
        if (!dato.ok) { aviso.textContent = dato.error; return; }
        cerrar('guardado');
      } catch (err) {
        aviso.textContent = 'No se pudo guardar: ' + err.message;
      }
    };
  });
}
