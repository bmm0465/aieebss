import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { items, title, gradeLevel } = await request.json();

    // PDF 데이터를 클라이언트에서 생성하도록 문항 데이터만 반환
    // (jsPDF는 클라이언트 사이드 라이브러리이므로)
    
    // 문항 데이터를 HTML 형식으로 변환
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 {
      color: #2980b9;
      margin-top: 30px;
      border-left: 5px solid #3498db;
      padding-left: 15px;
    }
    .meta-info {
      text-align: center;
      color: #7f8c8d;
      margin-bottom: 40px;
      font-size: 14px;
    }
    .test-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .items-grid {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 10px;
      margin: 20px 0;
    }
    .item {
      border: 1px solid #bdc3c7;
      padding: 8px;
      text-align: center;
      border-radius: 4px;
      background-color: #ecf0f1;
    }
    .passage {
      background-color: #f8f9fa;
      padding: 20px;
      border-left: 4px solid #3498db;
      line-height: 1.8;
      white-space: pre-wrap;
      margin: 20px 0;
    }
    .maze-question {
      background-color: #f8f9fa;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
      border-left: 3px solid #e74c3c;
    }
    .choices {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    .choice {
      padding: 5px 15px;
      border: 1px solid #95a5a6;
      border-radius: 3px;
      background-color: white;
    }
    .correct {
      background-color: #d4edda;
      border-color: #28a745;
      font-weight: bold;
    }
    .note {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      font-style: italic;
      color: #856404;
    }
    @media print {
      body { padding: 20px; }
      .test-section { page-break-after: always; }
    }
  </style>
</head>
<body>
  <h1>DIBELS 8th Edition 평가 문항지</h1>
  <div class="meta-info">
    <p>학년: ${gradeLevel} | 생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
  </div>
`;

    // LNF
    if (items.LNF && items.LNF.length > 0) {
      htmlContent += `
  <div class="test-section">
    <h2>1. LNF - Letter Naming Fluency (알파벳 인식)</h2>
    <p>총 ${items.LNF.length}개 문항</p>
    <div class="note">학생은 알파벳의 이름을 말해야 합니다 (예: A → "에이")</div>
    <div class="items-grid">
      ${items.LNF.map((letter: string) => `<div class="item">${letter}</div>`).join('\n      ')}
    </div>
  </div>
`;
    }

    // PSF
    if (items.PSF && items.PSF.length > 0) {
      htmlContent += `
  <div class="test-section">
    <h2>2. PSF - Phoneme Segmentation Fluency (음소 분리)</h2>
    <p>총 ${items.PSF.length}개 단어</p>
    <div class="note">학생은 단어를 음소 단위로 분리해야 합니다 (예: cat → /k/ /æ/ /t/)</div>
    <div class="items-grid">
      ${items.PSF.map((word: string) => `<div class="item">${word}</div>`).join('\n      ')}
    </div>
  </div>
`;
    }

    // NWF
    if (items.NWF && items.NWF.length > 0) {
      htmlContent += `
  <div class="test-section">
    <h2>3. NWF - Nonsense Word Fluency (파닉스 적용)</h2>
    <p>총 ${items.NWF.length}개 무의미 단어</p>
    <div class="note">학생은 파닉스 규칙을 적용하여 무의미 단어를 읽어야 합니다</div>
    <div class="items-grid">
      ${items.NWF.map((word: string) => `<div class="item">${word}</div>`).join('\n      ')}
    </div>
  </div>
`;
    }

    // WRF
    if (items.WRF && items.WRF.length > 0) {
      htmlContent += `
  <div class="test-section">
    <h2>4. WRF - Word Recognition Fluency (Sight Words)</h2>
    <p>총 ${items.WRF.length}개 고빈도 단어</p>
    <div class="note">학생은 Sight Words를 자동으로 인식하고 읽어야 합니다</div>
    <div class="items-grid">
      ${items.WRF.map((word: string) => `<div class="item">${word}</div>`).join('\n      ')}
    </div>
  </div>
`;
    }

    // ORF
    if (items.ORF) {
      const wordCount = items.ORF.split(/\s+/).length;
      htmlContent += `
  <div class="test-section">
    <h2>5. ORF - Oral Reading Fluency (읽기 유창성)</h2>
    <p>총 약 ${wordCount}단어</p>
    <div class="note">학생은 1분 동안 지문을 읽고, WCPM과 정확도를 측정합니다</div>
    <div class="passage">${items.ORF}</div>
  </div>
`;
    }

    // MAZE
    if (items.MAZE && items.MAZE.length > 0) {
      htmlContent += `
  <div class="test-section">
    <h2>6. MAZE - 독해력 및 문맥 이해</h2>
    <p>총 ${items.MAZE.length}개 문항</p>
    <div class="note">학생은 문맥에 가장 적절한 단어를 선택해야 합니다</div>
`;
      items.MAZE.forEach((q: any) => {
        htmlContent += `
    <div class="maze-question">
      <strong>문항 ${q.num}:</strong> ${q.sentence}
      <div class="choices">
        ${q.choices.map((choice: string) => 
          `<span class="choice ${choice === q.answer ? 'correct' : ''}">${choice}${choice === q.answer ? ' ✓' : ''}</span>`
        ).join('\n        ')}
      </div>
    </div>
`;
      });
      htmlContent += `
  </div>
`;
    }

    htmlContent += `
</body>
</html>`;

    return NextResponse.json({
      success: true,
      html: htmlContent,
      filename: `DIBELS_${gradeLevel}_${Date.now()}.pdf`
    });
  } catch (error) {
    console.error('PDF 생성 에러:', error);
    return NextResponse.json(
      { success: false, error: 'PDF 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

