/* =========================================================
   Youth MVP 서버
   - Express + PostgreSQL (Render 배포용)
   - DATABASE_URL 없으면 메모리 모드로 동작 (로컬 테스트용)
   - 자가 핑으로 Render 무료 티어 잠들기 방지
========================================================= */
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '3mb' })); // 사진 base64 포함이라 넉넉히
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- DB ---------- */
let pool = null;
const mem = { users: new Set(), records: [], seq: 1 }; // 로컬 폴백

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

async function initDb() {
  if (!pool) {
    console.log('DB: 메모리 모드 (재시작하면 데이터 사라짐 — 로컬 테스트 전용)');
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT now(),
      push_sub JSONB
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      taken_at TIMESTAMPTZ DEFAULT now(),
      metrics JSONB NOT NULL,
      photo BYTEA NOT NULL
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id, taken_at);`);
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM records');
  console.log(`DB: Postgres 영속화 모드 (기록 ${rows[0].n}건 보유)`);
}

/* ---------- API ---------- */

// 기록 저장
app.post('/api/records', async (req, res) => {
  try {
    const { userId, metrics, photoBase64 } = req.body || {};
    if (!userId || !metrics || !photoBase64) {
      return res.status(400).json({ error: 'userId, metrics, photoBase64가 필요합니다' });
    }
    const b64 = String(photoBase64).replace(/^data:image\/\w+;base64,/, '');
    const photo = Buffer.from(b64, 'base64');
    if (photo.length > 1.5 * 1024 * 1024) {
      return res.status(413).json({ error: '사진이 너무 큽니다 (1.5MB 초과)' });
    }

    if (pool) {
      await pool.query(
        'INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [userId]);
      const { rows } = await pool.query(
        'INSERT INTO records (user_id, metrics, photo) VALUES ($1, $2, $3) RETURNING id, taken_at',
        [userId, metrics, photo]);
      return res.json({ id: String(rows[0].id), takenAt: rows[0].taken_at });
    } else {
      mem.users.add(userId);
      const rec = { id: mem.seq++, user_id: userId, taken_at: new Date(), metrics, photo };
      mem.records.push(rec);
      return res.json({ id: String(rec.id), takenAt: rec.taken_at });
    }
  } catch (e) {
    console.error('POST /api/records 오류:', e.message);
    res.status(500).json({ error: '저장에 실패했습니다' });
  }
});

// 기록 목록 (사진 제외 — 가볍게)
app.get('/api/records', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId가 필요합니다' });

    if (pool) {
      const { rows } = await pool.query(
        'SELECT id, taken_at, metrics FROM records WHERE user_id = $1 ORDER BY taken_at ASC',
        [userId]);
      return res.json(rows.map(r => ({ id: String(r.id), takenAt: r.taken_at, metrics: r.metrics })));
    } else {
      return res.json(mem.records
        .filter(r => r.user_id === userId)
        .map(r => ({ id: String(r.id), takenAt: r.taken_at, metrics: r.metrics })));
    }
  } catch (e) {
    console.error('GET /api/records 오류:', e.message);
    res.status(500).json({ error: '조회에 실패했습니다' });
  }
});

// 사진 개별 로드
app.get('/api/photo/:id', async (req, res) => {
  try {
    let photo = null;
    if (pool) {
      const { rows } = await pool.query('SELECT photo FROM records WHERE id = $1', [req.params.id]);
      photo = rows[0]?.photo || null;
    } else {
      photo = mem.records.find(r => String(r.id) === req.params.id)?.photo || null;
    }
    if (!photo) return res.status(404).end();
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.send(photo);
  } catch (e) {
    console.error('GET /api/photo 오류:', e.message);
    res.status(500).end();
  }
});

// 상태 확인용
app.get('/api/health', (req, res) => res.json({ ok: true, db: pool ? 'postgres' : 'memory' }));

/* ---------- 시작 ---------- */
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`💜 Youth MVP 서버 실행 중 (포트 ${PORT})`);

    // 자가 핑: Render 무료 티어의 15분 잠들기 방지 (텐미닛과 동일 패턴)
    const SELF_URL = process.env.RENDER_EXTERNAL_URL;
    if (SELF_URL) {
      console.log(`   자가 핑 활성화: ${SELF_URL}`);
      setInterval(() => fetch(SELF_URL + '/api/health').catch(() => {}), 10 * 60 * 1000);
    }
  });
}).catch(e => {
  console.error('DB 초기화 실패:', e.message);
  process.exit(1);
});
