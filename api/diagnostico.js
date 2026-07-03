// Función serverless (Vercel): recibe las respuestas del cuestionario y crea
// una ficha en la base "Diagnósticos Ley 21.719" de Notion.
// Requiere variables de entorno: NOTION_TOKEN y NOTION_DB_ID.
// Si no están configuradas o Notion falla, responde con error para que el
// cliente use su respaldo (Formspree).

const NOTION_API = 'https://api.notion.com/v1/pages';
const NOTION_VERSION = '2022-06-28';

function txt(content) { return { rich_text: [{ text: { content: String(content || '').slice(0, 2000) } }] }; }

function chunk(str, size) {
  var out = [], s = String(str || '');
  for (var i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const TOKEN = process.env.NOTION_TOKEN, DB = process.env.NOTION_DB_ID;
  if (!TOKEN || !DB) return res.status(503).json({ ok: false, error: 'not_configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  const empresa = b.empresa || b.contacto_nombre || 'Empresa sin nombre';
  const contacto = [b.contacto_nombre, b.contacto_cargo].filter(Boolean).join(' · ');
  const hoy = new Date().toISOString().slice(0, 10);

  const properties = {
    'Empresa': { title: [{ text: { content: String(empresa).slice(0, 2000) } }] },
    'Estado': { select: { name: 'Respondido' } },
    'Contacto': txt(contacto),
    'Correo': { email: b.correo || null },
    'Teléfono': { phone_number: b.telefono || null },
    'RUT empresa': txt(b.rut_empresa),
    'Código': txt(b.codigo_acceso),
    'Módulos': txt(b.modulos_activados),
    'Fecha respuesta': { date: { start: hoy } }
  };
  if (b.rubro) properties['Rubro'] = { select: { name: String(b.rubro).slice(0, 100) } };

  // Cuerpo de la página: transcripción legible + respuestas en JSON (para el motor futuro).
  const children = [{ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Respuestas del cuestionario' } }] } }];
  String(b.respuestas || '').split('\n').filter(function (l) { return l.trim(); }).slice(0, 90).forEach(function (line) {
    children.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line.slice(0, 2000) } }] } });
  });
  if (b.respuestas_json) {
    children.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: 'Datos en JSON (uso interno)' } }] } });
    chunk(b.respuestas_json, 1900).slice(0, 6).forEach(function (c) {
      children.push({ object: 'block', type: 'code', code: { language: 'json', rich_text: [{ text: { content: c } }] } });
    });
  }

  try {
    const r = await fetch(NOTION_API, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent: { database_id: DB }, properties: properties, children: children.slice(0, 100) })
    });
    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ ok: false, error: 'notion', status: r.status, detail: detail.slice(0, 300) });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'exception', message: String(e).slice(0, 200) });
  }
};
