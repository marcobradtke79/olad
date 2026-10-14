/**
 * Local test server for the full edit-and-save cycle. No external backend needed.
 * Plain node:http, run with `node test-server/server.ts` (Node 22.6+ strips the types).
 *
 *   GET  /config          test configuration (test-config.json merged with layers.json)
 *   GET  /data/:layer     current data of a GeoJSON layer; other files in data/ are served as is
 *   GET  /wfs             WFS GetFeature emulation (outputFormat=application/json, srsName, bbox)
 *   POST /changes[?fail=1] apply a change set, answer { idMap }; fail=1 answers 500
 *   GET  /changes/log     every change set received since start / reset
 *   POST /reset           restore the seed data
 *   GET  /                test page (public/), plus /dist/* and /vendor/{ol.js,ol.css,proj4.js,geotiff.js}
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';

proj4.defs(
  'EPSG:25832',
  '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
);

const ROOT = resolve(fileURLToPath(import.meta.url), '..');
const REPO = resolve(ROOT, '..');
const PORT = Number(process.env.PORT ?? 8787);
// geotiff is a dependency of ol, not of this repo: resolve it relative to ol's real location
// (pnpm symlinks node_modules/ol into its store).
const GEOTIFF_BROWSER = join(
  createRequire(realpathSync(join(REPO, 'node_modules/ol/package.json'))).resolve('geotiff'),
  '../../dist-browser',
);

type Geometry = { type: string; coordinates: unknown };
type Feature = {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: Geometry | null;
};
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

type Change =
  | {
      op: 'insert';
      layer: string;
      tempId: string;
      geometry: Geometry;
      properties?: Record<string, unknown>;
    }
  | {
      op: 'update';
      layer: string;
      id: string | number;
      geometry?: Geometry;
      properties?: Record<string, unknown>;
      changed?: string[];
    }
  | { op: 'delete'; layer: string; id: string | number };
type ChangeSet = { version: number; crs?: string; changes: (Change & { crs: string })[] };

/** Storage projection of the seed data. */
const DATA_CRS = 'EPSG:4326';

function reprojectCoordinates(coordinates: unknown, from: string, to: string): unknown {
  if (!Array.isArray(coordinates)) return coordinates;
  if (typeof coordinates[0] === 'number') return proj4(from, to, coordinates as number[]);
  return coordinates.map((c) => reprojectCoordinates(c, from, to));
}

/** GeoJSON geometry from `from` into the storage projection. */
function toDataCrs(
  geometry: Geometry | null | undefined,
  from: string,
): Geometry | null | undefined {
  if (!geometry || from === DATA_CRS) return geometry;
  const g = geometry as Geometry & { coordinates?: unknown };
  return { ...g, coordinates: reprojectCoordinates(g.coordinates, from, DATA_CRS) } as Geometry;
}

const seed = new Map<string, FeatureCollection>();
let data = new Map<string, FeatureCollection>();
const log: { receivedAt: string; changeSet: ChangeSet; idMap: Record<string, number> }[] = [];
let nextId = 10_000;

async function loadSeed(): Promise<void> {
  const dir = join(ROOT, 'data');
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.geojson')) continue;
    const layer = file.replace(/\.geojson$/, '');
    seed.set(layer, JSON.parse(await readFile(join(dir, file), 'utf8')) as FeatureCollection);
  }
  resetData();
}

/** Transform every coordinate of a GeoJSON geometry (data is stored in EPSG:4326). */
function transformGeometry(geometry: Geometry | null, to: string): Geometry | null {
  if (!geometry || to === 'EPSG:4326') return geometry;
  const code = /EPSG:{1,2}(\d+)$/i.exec(to)?.[1];
  const target = code ? `EPSG:${code}` : to;
  const walk = (c: unknown): unknown =>
    typeof (c as unknown[])[0] === 'number'
      ? proj4('EPSG:4326', target, c as number[])
      : (c as unknown[]).map(walk);
  return { ...geometry, coordinates: walk(geometry.coordinates) };
}

function intersects(geometry: Geometry | null, bbox: number[]): boolean {
  if (!geometry) return false;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === 'number') {
      const [x, y] = c as number[];
      minX = Math.min(minX, x!);
      maxX = Math.max(maxX, x!);
      minY = Math.min(minY, y!);
      maxY = Math.max(maxY, y!);
    } else (c as unknown[]).forEach(walk);
  };
  walk(geometry.coordinates);
  return !(maxX < bbox[0]! || minX > bbox[2]! || maxY < bbox[1]! || minY > bbox[3]!);
}

function resetData(): void {
  data = new Map([...seed].map(([k, v]) => [k, structuredClone(v)]));
  log.length = 0;
  nextId = 10_000;
}

function validateChangeSet(body: unknown): ChangeSet {
  if (typeof body !== 'object' || body === null) throw new Error('body must be an object');
  const cs = body as Partial<ChangeSet>;
  if (cs.version !== 1) throw new Error('version must be 1');
  if (cs.crs !== undefined && typeof cs.crs !== 'string') throw new Error('crs must be a string');
  if (!Array.isArray(cs.changes)) throw new Error('changes must be an array');
  cs.changes.forEach((c, i) => {
    if (!['insert', 'update', 'delete'].includes(c.op)) throw new Error(`changes[${i}].op invalid`);
    if (typeof c.crs !== 'string') throw new Error(`changes[${i}].crs must be a string`);
    if (typeof c.layer !== 'string') throw new Error(`changes[${i}].layer must be a string`);
    if (!data.has(c.layer)) throw new Error(`changes[${i}].layer "${c.layer}" unknown`);
    if (c.op === 'insert' && typeof c.tempId !== 'string')
      throw new Error(`changes[${i}].tempId required`);
    if (c.op !== 'insert' && c.id === undefined) throw new Error(`changes[${i}].id required`);
  });
  return cs as ChangeSet;
}

function applyChangeSet(cs: ChangeSet): Record<string, number> {
  const idMap: Record<string, number> = {};
  for (const change of cs.changes) {
    const collection = data.get(change.layer)!;
    if (change.op === 'insert') {
      const id = nextId++;
      idMap[change.tempId] = id;
      collection.features.push({
        type: 'Feature',
        id,
        properties: { ...(change.properties ?? {}), id },
        geometry: toDataCrs(change.geometry, change.crs) as Geometry,
      });
    } else {
      const index = collection.features.findIndex((f) => String(f.id) === String(change.id));
      if (index < 0) throw new Error(`feature ${change.id} not found in ${change.layer}`);
      if (change.op === 'delete') {
        collection.features.splice(index, 1);
      } else {
        const feature = collection.features[index]!;
        if (change.geometry) feature.geometry = toDataCrs(change.geometry, change.crs) as Geometry;
        if (change.properties) Object.assign(feature.properties, change.properties);
      }
    }
  }
  return idMap;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.kml': 'application/vnd.google-earth.kml+xml; charset=utf-8',
  '.gpx': 'application/gpx+xml; charset=utf-8',
  '.gml': 'application/gml+xml; charset=utf-8',
  '.topojson': 'application/json; charset=utf-8',
};

function send(res: ServerResponse, status: number, body: unknown, type = MIME['.json']): void {
  res.writeHead(status, {
    'content-type': type,
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2));
}

async function sendFile(res: ServerResponse, base: string, rel: string): Promise<void> {
  const path = normalize(join(base, rel));
  if (!path.startsWith(base) || !existsSync(path)) return send(res, 404, { error: 'not found' });
  send(res, 200, await readFile(path), MIME[extname(path)] ?? 'application/octet-stream');
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const { pathname } = url;
  const method = req.method ?? 'GET';

  if (method === 'OPTIONS') return send(res, 204, '');

  if (method === 'GET' && pathname === '/config') {
    // The layers live in their own file (editability and attribute schema per layer) and are
    // merged into the editor configuration here, so the library still receives one object.
    const config = JSON.parse(await readFile(join(ROOT, 'config/test-config.json'), 'utf8'));
    const { layers } = JSON.parse(await readFile(join(ROOT, 'config/layers.json'), 'utf8'));
    if (!Array.isArray(layers)) {
      return send(res, 500, { error: 'config/layers.json must contain a "layers" array' });
    }
    return send(res, 200, { ...config, layers });
  }
  if (method === 'GET' && pathname.startsWith('/data/')) {
    const file = decodeURIComponent(pathname.slice('/data/'.length));
    const layer = file.replace(/\.geojson$/, '');
    const collection = data.get(layer);
    if (collection) return send(res, 200, collection, MIME['.geojson']);
    if (file.includes('.')) return sendFile(res, join(ROOT, 'data'), file);
    return send(res, 404, { error: `unknown layer "${layer}"` });
  }
  if (method === 'GET' && pathname === '/wfs') {
    const typeName =
      url.searchParams.get('typeName') ??
      url.searchParams.get('typeNames') ??
      url.searchParams.get('TYPENAME');
    const collection = typeName ? data.get(typeName) : undefined;
    if (!collection) return send(res, 400, { error: `unknown typeName "${typeName}"` });
    if (!/json/i.test(url.searchParams.get('outputFormat') ?? '')) {
      return send(res, 400, {
        error: 'this emulation only supports outputFormat=application/json',
      });
    }
    const srsName = url.searchParams.get('srsName') ?? 'EPSG:4326';
    const bboxParam = url.searchParams.get('bbox');
    const features = collection.features
      .map((f) => ({ ...f, geometry: transformGeometry(f.geometry, srsName) }))
      .filter(
        (f) => !bboxParam || intersects(f.geometry, bboxParam.split(',').slice(0, 4).map(Number)),
      );
    return send(res, 200, { type: 'FeatureCollection', features }, MIME['.geojson']);
  }
  if (method === 'GET' && pathname === '/changes/log') return send(res, 200, log);
  if (method === 'POST' && pathname === '/changes') {
    if (url.searchParams.get('fail') === '1') {
      return send(res, 500, { error: 'simulated server failure (fail=1)' });
    }
    try {
      const changeSet = validateChangeSet(await readJson(req));
      const idMap = applyChangeSet(changeSet);
      log.push({ receivedAt: new Date().toISOString(), changeSet, idMap });
      return send(res, 200, { idMap });
    } catch (error) {
      return send(res, 400, { error: (error as Error).message });
    }
  }
  if (method === 'POST' && pathname === '/reset') {
    resetData();
    return send(res, 200, { ok: true });
  }

  if (method === 'GET') {
    if (pathname === '/vendor/ol.js')
      return sendFile(res, join(REPO, 'node_modules/ol'), 'dist/ol.js');
    if (pathname === '/vendor/ol.css')
      return sendFile(res, join(REPO, 'node_modules/ol'), 'ol.css');
    if (pathname === '/vendor/geotiff.js') return sendFile(res, GEOTIFF_BROWSER, 'geotiff.js');
    if (pathname === '/vendor/proj4.js') {
      return sendFile(res, join(REPO, 'node_modules/proj4/dist'), 'proj4.js');
    }
    if (pathname.startsWith('/dist/'))
      return sendFile(res, join(REPO, 'dist'), pathname.slice('/dist/'.length));
    return sendFile(res, join(ROOT, 'public'), pathname === '/' ? 'index.html' : pathname);
  }
  send(res, 405, { error: 'method not allowed' });
}

await loadSeed();
createServer((req, res) => {
  handle(req, res).catch((error: Error) => send(res, 500, { error: error.message }));
}).listen(PORT, () => {
  console.log(
    `ol-cad test server: http://localhost:${PORT}/  (layers: ${[...data.keys()].join(', ')})`,
  );
  if (!existsSync(join(REPO, 'dist/ol-cad.umd.js'))) {
    console.warn(
      'dist/ol-cad.umd.js not found. Run `pnpm build` so the test page can load the library.',
    );
  }
});
