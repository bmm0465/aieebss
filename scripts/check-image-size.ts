import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'public', 'images', 'vocabulary', 'chunjae-text-ham');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));

let total = 0;
files.forEach(f => {
  const stats = fs.statSync(path.join(dir, f));
  total += stats.size;
});

const avg = total / files.length;
const estimated130 = avg * 130;

console.log(`현재 파일 수: ${files.length}개`);
console.log(`총 크기: ${(total / 1024 / 1024).toFixed(2)} MB`);
console.log(`평균 크기: ${(avg / 1024 / 1024).toFixed(2)} MB`);
console.log(`130개 예상: ${(estimated130 / 1024 / 1024).toFixed(2)} MB`);

