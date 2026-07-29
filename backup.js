// AU 일학습병행 - Firestore 자동 백업 스크립트
// 매일 자정 GitHub Actions에 의해 실행됨

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Service Account 인증
const serviceAccount = require('./.secrets/sa.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'au-ilhaksub'
});

const db = admin.firestore();

// 백업할 컬렉션 목록
const COLLECTIONS = [
  'users',
  'notices',
  'consulting',
  'library',
  'calendar_events',
  'surveyConfig',
  'audit_logs',
  'scheduled_notifications'
];

async function backupCollection(name) {
  console.log(`📦 Backing up ${name}...`);
  const snapshot = await db.collection(name).get();
  const docs = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    // Timestamp → ISO string 변환 (JSON 직렬화 위해)
    docs[doc.id] = JSON.parse(JSON.stringify(data, (key, value) => {
      if (value && value._seconds !== undefined) {
        return new Date(value._seconds * 1000).toISOString();
      }
      return value;
    }));
  });
  return { count: snapshot.size, docs };
}

async function main() {
  // 백업은 한국시간 새벽 3시(UTC 18시)에 돌기 때문에 UTC 날짜를 쓰면
  // 파일명이 실제 실행일보다 하루 이르게 찍힌다 → 한국 시각 기준으로 계산
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const today = kst.toISOString().split('T')[0];
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const backup = {
    timestamp: new Date().toISOString(),
    project: 'au-ilhaksub',
    collections: {}
  };

  let totalDocs = 0;
  for (const col of COLLECTIONS) {
    try {
      const result = await backupCollection(col);
      backup.collections[col] = result.docs;
      totalDocs += result.count;
      console.log(`   ✅ ${col}: ${result.count} docs`);
    } catch (e) {
      console.warn(`   ⚠️ ${col}: ${e.message}`);
      backup.collections[col] = { _error: e.message };
    }
  }

  // 백업 파일 저장
  const filename = path.join(backupDir, `backup-${today}.json`);
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2), 'utf8');

  // 요약 파일 (최신 백업 정보)
  const summary = {
    lastBackup: new Date().toISOString(),
    totalDocs,
    file: `backup-${today}.json`,
    collections: Object.keys(backup.collections).map(k => ({
      name: k,
      count: backup.collections[k]._error ? 'error' : Object.keys(backup.collections[k]).length
    }))
  };
  fs.writeFileSync(path.join(backupDir, 'latest.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n🎉 Backup complete!`);
  console.log(`   File: ${filename}`);
  console.log(`   Total docs: ${totalDocs}`);
  console.log(`   Size: ${(fs.statSync(filename).size / 1024).toFixed(1)} KB`);
}

main().catch(e => {
  console.error('❌ Backup failed:', e);
  process.exit(1);
});
