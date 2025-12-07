import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

// 승인된 문항 조회 함수
async function fetchApprovedItems(testType: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('generated_test_items')
    .select('id, test_type, grade_level, items, status, created_at')
    .eq('status', 'approved')
    .eq('test_type', testType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const items = data.items as Record<string, unknown>;
  
  // 테스트 타입에 맞는 문항 추출
  switch (testType) {
    case 'p1_alphabet':
      return items.p1_alphabet || items.LNF || null;
    case 'p2_segmental_phoneme':
      return items.p2_segmental_phoneme || items.PSF || null;
    case 'p3_suprasegmental_phoneme':
      return items.p3_suprasegmental_phoneme || items.STRESS || null;
    case 'p4_phonics':
      return items.p4_phonics || null;
    case 'p5_vocabulary':
      return items.p5_vocabulary || items.MEANING || null;
    case 'p6_comprehension':
      return items.p6_comprehension || items.COMPREHENSION || null;
    default:
      return null;
  }
}

// 폴백 문항 로드 함수들 (각 테스트 페이지에서 사용하는 실제 폴백 문항)
async function loadFallbackItems(testType: string) {
  switch (testType) {
    case 'p1_alphabet': {
      // p1_alphabet 페이지의 getFixedAlphabet() 함수와 동일
      return [
        'l', 'E', 'm', 'S', 'O', 'B', 'J', 'c', 'w', 'g',
        'y', 'b', 'F', 'r', 'k', 'u', 'j', 'V', 'Q', 's',
        'H', 'h', 'G', 'z', 'o', 'T', 'C', 't', 'R', 'A',
        'N', 'M', 'X', 'W', 'Y', 'd', 'f', 'D', 'v', 'p',
        'I', 'U', 'K', 'x', 'l', 'e', 'n', 'I', 'P', 'a',
        'Z', 'q'
      ];
    }
    case 'p2_segmental_phoneme': {
      // p2_segmental_phoneme 페이지의 getFixedMinimalPairs() 함수와 동일
      return [
        { word1: 'fine', word2: 'five', correctAnswer: 'fine' },
        { word1: 'big', word2: 'pig', correctAnswer: 'big' },
        { word1: 'book', word2: 'look', correctAnswer: 'book' },
        { word1: 'pen', word2: 'ten', correctAnswer: 'pen' },
        { word1: 'king', word2: 'ring', correctAnswer: 'king' },
        { word1: 'cat', word2: 'hat', correctAnswer: 'cat' },
        { word1: 'sit', word2: 'six', correctAnswer: 'sit' },
        { word1: 'that', word2: 'what', correctAnswer: 'that' },
        { word1: 'can', word2: 'cat', correctAnswer: 'can' },
        { word1: 'go', word2: 'no', correctAnswer: 'go' },
        { word1: 'do', word2: 'go', correctAnswer: 'do' },
        { word1: 'how', word2: 'now', correctAnswer: 'how' },
        { word1: 'at', word2: 'it', correctAnswer: 'at' },
        { word1: 'in', word2: 'it', correctAnswer: 'in' },
        { word1: 'be', word2: 'he', correctAnswer: 'be' },
        { word1: 'nice', word2: 'nine', correctAnswer: 'nice' },
        { word1: 'ring', word2: 'sing', correctAnswer: 'ring' },
        { word1: 'she', word2: 'the', correctAnswer: 'she' },
        { word1: 'cow', word2: 'how', correctAnswer: 'cow' },
        { word1: 'cow', word2: 'now', correctAnswer: 'cow' },
        { word1: 'not', word2: 'now', correctAnswer: 'not' },
      ];
    }
    case 'p3_suprasegmental_phoneme': {
      // JSON 파일에서 로드 시도
      try {
        const filePath = path.join(process.cwd(), 'public', 'data', 'p3_stress_items.json');
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const jsonItems = JSON.parse(fileContents);
        if (Array.isArray(jsonItems) && jsonItems.length > 0) {
          return jsonItems;
        }
      } catch {
        // 파일이 없거나 파싱 오류 시 기본값 사용
      }
      // 기본값 (p3_suprasegmental_phoneme 페이지의 getFixedStressItems()와 동일)
      return [
        { word: 'apple', choices: ['APple', 'apPLE', 'APPLE'], correctAnswer: 'APple' },
        { word: 'banana', choices: ['BANana', 'banANa', 'bananA'], correctAnswer: 'banANa' },
        { word: 'brother', choices: ['BROther', 'broTHER', 'BROTHER'], correctAnswer: 'BROther' },
        { word: 'carrot', choices: ['CARrot', 'carROT', 'CARROT'], correctAnswer: 'CARrot' },
        { word: 'chicken', choices: ['CHIcken', 'chiCKEN', 'CHICKEN'], correctAnswer: 'CHIcken' },
      ];
    }
    case 'p4_phonics': {
      // JSON 파일에서 로드 시도
      try {
        const filePath = path.join(process.cwd(), 'public', 'data', 'p4_items.json');
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const jsonItems = JSON.parse(fileContents);
        if (jsonItems && typeof jsonItems === 'object') {
          return jsonItems;
        }
      } catch {
        // 파일이 없거나 파싱 오류 시 기본값 사용
      }
      // 기본값 (p4_phonics 페이지의 폴백과 동일)
      return {
        nwf: ['sep', 'het', 'tum', 'lut', 'dit', 'reg', 'fet', 'pom', 'teb', 'gid'],
        wrf: ['apple', 'banana', 'brother', 'carrot', 'chicken', 'color', 'elephant', 'eraser', 'flower', 'grandfather'],
        orf: ["I'm Momo", 'How are you?', "What's this", "It's a bike", "It's a robot", 'Sit down, please', 'Open the door, please', 'Thank you', "You're welcome", 'How many cows?'],
      };
    }
    case 'p5_vocabulary': {
      // p5는 동적으로 생성되므로 null 반환 (표시 안 함)
      return null;
    }
    case 'p6_comprehension': {
      // JSON 파일에서 로드 시도
      try {
        const filePath = path.join(process.cwd(), 'public', 'data', 'p6_items.json');
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const jsonItems = JSON.parse(fileContents);
        if (Array.isArray(jsonItems) && jsonItems.length > 0) {
          // p6_items.json 형식을 ComprehensionItem 형식으로 변환
          return jsonItems.map((item: any) => ({
            dialogueOrStory: `${item.script.speaker1}\n${item.script.speaker2}`,
            question: item.question,
            options: item.options.map((opt: any) => ({
              type: 'word' as const,
              content: opt.description,
            })),
            correctAnswer: item.options.find((opt: any) => opt.isCorrect)?.description || '',
            isDialogue: true,
            speaker1: item.script.speaker1,
            speaker2: item.script.speaker2,
          }));
        }
      } catch {
        // 파일이 없거나 파싱 오류 시 null 반환
      }
      return null;
    }
    default:
      return null;
  }
}

export default async function TestItemsPage() {
  const supabase = await createClient();

  // 세션 확인 - getUser()로 변경 (더 안정적)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('User authentication error:', userError);
    redirect('/');
  }

  // 교사 권한 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'teacher') {
    redirect('/lobby');
  }

  // 데이터베이스에서 승인된 문항 조회, 없으면 폴백 문항 사용
  const [p1ItemsDB, p2ItemsDB, p3ItemsDB, p4ItemsDB, p5ItemsDB, p6ItemsDB] = await Promise.all([
    fetchApprovedItems('p1_alphabet'),
    fetchApprovedItems('p2_segmental_phoneme'),
    fetchApprovedItems('p3_suprasegmental_phoneme'),
    fetchApprovedItems('p4_phonics'),
    fetchApprovedItems('p5_vocabulary'),
    fetchApprovedItems('p6_comprehension'),
  ]);

  // 폴백 문항 로드
  const [p1ItemsFallback, p2ItemsFallback, p3ItemsFallback, p4ItemsFallback, p5ItemsFallback, p6ItemsFallback] = await Promise.all([
    loadFallbackItems('p1_alphabet'),
    loadFallbackItems('p2_segmental_phoneme'),
    loadFallbackItems('p3_suprasegmental_phoneme'),
    loadFallbackItems('p4_phonics'),
    loadFallbackItems('p5_vocabulary'),
    loadFallbackItems('p6_comprehension'),
  ]);

  // DB 문항이 있으면 사용, 없으면 폴백 문항 사용
  const p1Items = p1ItemsDB || p1ItemsFallback;
  const p2Items = p2ItemsDB || p2ItemsFallback;
  const p3Items = p3ItemsDB || p3ItemsFallback;
  const p4Items = p4ItemsDB || p4ItemsFallback;
  const p5Items = p5ItemsDB || p5ItemsFallback;
  const p6Items = p6ItemsDB || p6ItemsFallback;

  // 각 평가의 문항 데이터 (데이터베이스에서 가져온 실제 문항 또는 폴백 데이터)
  const testItems = {
    p1_alphabet: {
      title: "1교시 - 알파벳 이름 말하기",
      description: "알파벳 인식 능력 평가",
      totalItems: p1Items && Array.isArray(p1Items) ? p1Items.length : 0,
      items: p1Items && Array.isArray(p1Items) ? p1Items : [],
      type: 'list',
      note: '학생은 알파벳의 이름(예: A → "에이")을 말해야 합니다.',
      fromDB: !!p1ItemsDB
    },
    p2_segmental_phoneme: {
      title: "2교시 - 음소 분리",
      description: "최소대립쌍 듣고 식별 능력 평가",
      totalItems: p2Items && Array.isArray(p2Items) ? p2Items.length : 0,
      items: p2Items && Array.isArray(p2Items) ? p2Items : [],
      type: 'minimal-pairs',
      note: '학생은 두 단어를 듣고 들려준 단어를 선택합니다. 최소대립쌍(minimal pairs)은 하나의 음소만 다른 단어 쌍입니다.',
      fromDB: !!p2ItemsDB
    },
    p3_suprasegmental_phoneme: {
      title: "3교시 - 강세 및 리듬 패턴",
      description: "강세 패턴 식별 능력 평가",
      totalItems: p3Items && Array.isArray(p3Items) ? p3Items.length : 0,
      items: p3Items && Array.isArray(p3Items) ? p3Items : [],
      type: 'stress-pattern',
      note: '학생은 단어를 듣고 올바른 강세 패턴을 선택합니다.',
      fromDB: !!p3ItemsDB
    },
    p4_phonics: {
      title: "4교시 - 파닉스 읽기",
      description: "파닉스 적용 능력 평가",
      totalItems: 0,
      nwf: (p4Items && typeof p4Items === 'object' && 'nwf' in p4Items && Array.isArray(p4Items.nwf)) ? p4Items.nwf : [],
      wrf: (p4Items && typeof p4Items === 'object' && 'wrf' in p4Items && Array.isArray(p4Items.wrf)) ? p4Items.wrf : [],
      orf: (p4Items && typeof p4Items === 'object' && 'orf' in p4Items && Array.isArray(p4Items.orf)) ? p4Items.orf : [],
      type: 'phonics',
      note: '무의미 단어(NWF), 단어 읽기(WRF), 구두 읽기(ORF) 능력을 평가합니다.',
      fromDB: !!p4ItemsDB
    },
    p5_vocabulary: {
      title: "5교시 - 의미 이해",
      description: "단어/문장 의미 이해 능력 평가",
      totalItems: p5Items && Array.isArray(p5Items) ? p5Items.length : 0,
      items: p5Items && Array.isArray(p5Items) ? p5Items : [],
      type: 'meaning',
      note: '학생은 단어나 문장을 듣거나 읽고 알맞은 그림을 선택합니다.',
      fromDB: !!p5ItemsDB
    },
    p6_comprehension: {
      title: "6교시 - 주요 정보 파악",
      description: "주요 정보 파악 능력 평가",
      totalItems: p6Items && Array.isArray(p6Items) ? p6Items.length : 0,
      items: p6Items && Array.isArray(p6Items) ? p6Items : [],
      type: 'comprehension',
      note: '학생은 짧은 대화나 이야기를 듣거나 읽고 질문에 맞는 답을 선택합니다.',
      fromDB: !!p6ItemsDB
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#f3f4f6', 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: '#171717'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '20px',
          marginBottom: '2rem',
          border: '2px solid #e5e7eb',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  margin: 0,
                  fontFamily: 'var(--font-noto-sans-kr)',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 'bold'
                }}>
                  📋 평가 문항 및 정답 확인
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', color: '#4b5563', fontSize: '1.1rem', fontWeight: '500' }}>
                  각 평가에 출제되는 문항과 정답을 확인할 수 있습니다
                </p>
              </div>
            </div>
            <Link 
              href="/teacher/dashboard"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                padding: '0.8rem 1.5rem',
                borderRadius: '12px',
                textDecoration: 'none',
                border: 'none',
                fontWeight: '600',
                boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              ← 대시보드로
            </Link>
          </div>
        </div>

        {/* 1교시 - 알파벳 */}
        {testItems.p1_alphabet.totalItems > 0 ? (
          <div>
            <TestItemSection 
              title={testItems.p1_alphabet.title}
              description={testItems.p1_alphabet.description + (testItems.p1_alphabet.fromDB ? '' : ' (기본 문항)')}
              totalItems={testItems.p1_alphabet.totalItems}
              items={testItems.p1_alphabet.items}
              note={testItems.p1_alphabet.note}
            />
            {!testItems.p1_alphabet.fromDB && (
              <p style={{ fontSize: '0.85rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '-1.5rem', marginBottom: '1rem', paddingLeft: '2rem' }}>
                ℹ️ 데이터베이스에 승인된 문항이 없어 실제 테스트에서 사용되는 기본 문항을 표시합니다.
              </p>
            )}
          </div>
        ) : (
          <NoItemsSection title={testItems.p1_alphabet.title} description={testItems.p1_alphabet.description} />
        )}

        {/* 2교시 - 음소 분리 */}
        {testItems.p2_segmental_phoneme.totalItems > 0 ? (
          <div>
            <MinimalPairsSection 
              title={testItems.p2_segmental_phoneme.title}
              description={testItems.p2_segmental_phoneme.description + (testItems.p2_segmental_phoneme.fromDB ? '' : ' (기본 문항)')}
              items={testItems.p2_segmental_phoneme.items}
              note={testItems.p2_segmental_phoneme.note}
            />
            {!testItems.p2_segmental_phoneme.fromDB && (
              <p style={{ fontSize: '0.85rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '-1.5rem', marginBottom: '1rem', paddingLeft: '2rem' }}>
                ℹ️ 데이터베이스에 승인된 문항이 없어 실제 테스트에서 사용되는 기본 문항을 표시합니다.
              </p>
            )}
          </div>
        ) : (
          <NoItemsSection title={testItems.p2_segmental_phoneme.title} description={testItems.p2_segmental_phoneme.description} />
        )}

        {/* 3교시 - 강세 및 리듬 패턴 */}
        {testItems.p3_suprasegmental_phoneme.totalItems > 0 ? (
          <div>
            <StressPatternSection 
              title={testItems.p3_suprasegmental_phoneme.title}
              description={testItems.p3_suprasegmental_phoneme.description + (testItems.p3_suprasegmental_phoneme.fromDB ? '' : ' (기본 문항)')}
              items={testItems.p3_suprasegmental_phoneme.items}
              note={testItems.p3_suprasegmental_phoneme.note}
            />
            {!testItems.p3_suprasegmental_phoneme.fromDB && (
              <p style={{ fontSize: '0.85rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '-1.5rem', marginBottom: '1rem', paddingLeft: '2rem' }}>
                ℹ️ 데이터베이스에 승인된 문항이 없어 실제 테스트에서 사용되는 기본 문항을 표시합니다.
              </p>
            )}
          </div>
        ) : (
          <NoItemsSection title={testItems.p3_suprasegmental_phoneme.title} description={testItems.p3_suprasegmental_phoneme.description} />
        )}

        {/* 4교시 - 파닉스 */}
        {(testItems.p4_phonics.nwf.length > 0 || testItems.p4_phonics.wrf.length > 0 || testItems.p4_phonics.orf.length > 0) ? (
          <div>
            <PhonicsSection 
              title={testItems.p4_phonics.title}
              description={testItems.p4_phonics.description + (testItems.p4_phonics.fromDB ? '' : ' (기본 문항)')}
              nwf={testItems.p4_phonics.nwf}
              wrf={testItems.p4_phonics.wrf}
              orf={testItems.p4_phonics.orf}
              note={testItems.p4_phonics.note}
            />
            {!testItems.p4_phonics.fromDB && (
              <p style={{ fontSize: '0.85rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '-1.5rem', marginBottom: '1rem', paddingLeft: '2rem' }}>
                ℹ️ 데이터베이스에 승인된 문항이 없어 실제 테스트에서 사용되는 기본 문항을 표시합니다.
              </p>
            )}
          </div>
        ) : (
          <NoItemsSection title={testItems.p4_phonics.title} description={testItems.p4_phonics.description} />
        )}

        {/* 5교시 - 의미 이해 */}
        {testItems.p5_vocabulary.totalItems > 0 ? (
          <div>
            <MeaningSection 
              title={testItems.p5_vocabulary.title}
              description={testItems.p5_vocabulary.description + (testItems.p5_vocabulary.fromDB ? '' : ' (기본 문항)')}
              items={testItems.p5_vocabulary.items}
              note={testItems.p5_vocabulary.note}
            />
            {!testItems.p5_vocabulary.fromDB && (
              <p style={{ fontSize: '0.85rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '-1.5rem', marginBottom: '1rem', paddingLeft: '2rem' }}>
                ℹ️ 데이터베이스에 승인된 문항이 없어 실제 테스트에서 사용되는 기본 문항을 표시합니다.
              </p>
            )}
          </div>
        ) : (
          <NoItemsSection title={testItems.p5_vocabulary.title} description={testItems.p5_vocabulary.description} />
        )}

        {/* 6교시 - 주요 정보 파악 */}
        {testItems.p6_comprehension.totalItems > 0 ? (
          <div>
            <ComprehensionSection 
              title={testItems.p6_comprehension.title}
              description={testItems.p6_comprehension.description + (testItems.p6_comprehension.fromDB ? '' : ' (기본 문항)')}
              items={testItems.p6_comprehension.items}
              note={testItems.p6_comprehension.note}
            />
            {!testItems.p6_comprehension.fromDB && (
              <p style={{ fontSize: '0.85rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '-1.5rem', marginBottom: '1rem', paddingLeft: '2rem' }}>
                ℹ️ 데이터베이스에 승인된 문항이 없어 실제 테스트에서 사용되는 기본 문항을 표시합니다.
              </p>
            )}
          </div>
        ) : (
          <NoItemsSection title={testItems.p6_comprehension.title} description={testItems.p6_comprehension.description} />
        )}
      </div>
    </div>
  );
}

// 리스트형 문항 섹션 컴포넌트
function TestItemSection({ 
  title, 
  description, 
  totalItems, 
  items, 
  note 
}: { 
  title: string; 
  description: string; 
  totalItems: number; 
  items: string[]; 
  note: string;
}) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      padding: '2rem',
      borderRadius: '20px',
      marginBottom: '2rem',
      border: '2px solid #e5e7eb',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1.5rem',
        fontSize: '1.75rem',
        fontWeight: 'bold'
      }}>
        {title}
      </h2>
      <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
        {description} - 총 {totalItems}개 문항
      </p>
      <div style={{
        backgroundColor: '#f9fafb',
        padding: '1.5rem',
        borderRadius: '12px',
        maxHeight: '300px',
        overflowY: 'auto',
        marginBottom: '1rem',
        border: '2px solid #e5e7eb'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
          gap: '0.5rem'
        }}>
          {items.map((item, idx) => (
            <div 
              key={idx}
              style={{
                padding: '0.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.9rem',
                border: '1px solid #e5e7eb',
                color: '#171717',
                fontWeight: '500'
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
        💡 {note}
      </p>
    </div>
  );
}

// 최소대립쌍 섹션 컴포넌트
function MinimalPairsSection({
  title,
  description,
  items,
  note
}: {
  title: string;
  description: string;
  items: Array<{ word1: string; word2: string; correctAnswer: string }>;
  note: string;
}) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      padding: '2rem',
      borderRadius: '20px',
      marginBottom: '2rem',
      border: '2px solid #e5e7eb',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1.5rem',
        fontSize: '1.75rem',
        fontWeight: 'bold'
      }}>
        {title}
      </h2>
      <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
        {description} - 총 {items.length}문항
      </p>
      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            backgroundColor: '#f9fafb',
            padding: '1rem',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '0.5rem', color: '#171717' }}>
              <strong style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>문항 {idx + 1}:</strong> {item.word1} / {item.word2}
            </div>
            <div style={{ color: '#10b981', fontWeight: '600', marginLeft: '1rem' }}>
              정답: {item.correctAnswer} ✓
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic', marginTop: '1rem' }}>
        💡 {note}
      </p>
    </div>
  );
}

// 강세 패턴 섹션 컴포넌트
function StressPatternSection({
  title,
  description,
  items,
  note
}: {
  title: string;
  description: string;
  items: Array<{ word: string; choices: string[]; correctAnswer: string }>;
  note: string;
}) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      padding: '2rem',
      borderRadius: '20px',
      marginBottom: '2rem',
      border: '2px solid #e5e7eb',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1.5rem',
        fontSize: '1.75rem',
        fontWeight: 'bold'
      }}>
        {title}
      </h2>
      <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
        {description} - 총 {items.length}문항
      </p>
      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            backgroundColor: '#f9fafb',
            padding: '1rem',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '0.5rem', color: '#171717' }}>
              <strong style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>문항 {idx + 1}:</strong> {item.word}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              {item.choices.map((choice, optIdx) => (
                <span 
                  key={optIdx}
                  style={{
                    padding: '0.3rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    backgroundColor: choice === item.correctAnswer 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : '#ffffff',
                    border: choice === item.correctAnswer 
                      ? '2px solid #10b981' 
                      : '1px solid #e5e7eb',
                    color: choice === item.correctAnswer ? '#10b981' : '#171717',
                    fontWeight: choice === item.correctAnswer ? '600' : '400'
                  }}
                >
                  {choice} {choice === item.correctAnswer && '✓'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic', marginTop: '1rem' }}>
        💡 {note}
      </p>
    </div>
  );
}

// 파닉스 섹션 컴포넌트
function PhonicsSection({
  title,
  description,
  nwf,
  wrf,
  orf,
  note
}: {
  title: string;
  description: string;
  nwf: string[];
  wrf: string[];
  orf: string[];
  note: string;
}) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      padding: '2rem',
      borderRadius: '20px',
      marginBottom: '2rem',
      border: '2px solid #e5e7eb',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1.5rem',
        fontSize: '1.75rem',
        fontWeight: 'bold'
      }}>
        {title}
      </h2>
      <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
        {description}
      </p>
      
      {nwf.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#171717' }}>NWF (무의미 단어) - {nwf.length}개</h3>
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '12px',
            maxHeight: '300px',
            overflowY: 'auto',
            marginBottom: '1rem',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
              gap: '0.5rem'
            }}>
              {nwf.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    border: '1px solid #e5e7eb',
                    color: '#171717',
                    fontWeight: '500'
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {wrf.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#171717' }}>WRF (단어 읽기) - {wrf.length}개</h3>
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '12px',
            maxHeight: '300px',
            overflowY: 'auto',
            marginBottom: '1rem',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
              gap: '0.5rem'
            }}>
              {wrf.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    border: '1px solid #e5e7eb',
                    color: '#171717',
                    fontWeight: '500'
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {orf.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#171717' }}>ORF (구두 읽기) - {orf.length}개</h3>
          <div style={{ 
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            border: '2px solid #e5e7eb'
          }}>
            {orf.map((passage, idx) => (
              <div key={idx} style={{ marginBottom: idx < orf.length - 1 ? '1.5rem' : '0' }}>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  lineHeight: '1.8',
                  margin: 0,
                  color: '#171717'
                }}>
                  {passage}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic', marginTop: '1rem' }}>
        💡 {note}
      </p>
    </div>
  );
}

// 의미 이해 섹션 컴포넌트
function MeaningSection({
  title,
  description,
  items,
  note
}: {
  title: string;
  description: string;
  items: Array<{ wordOrPhrase: string; imageOptions: string[]; correctAnswer: string }>;
  note: string;
}) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      padding: '2rem',
      borderRadius: '20px',
      marginBottom: '2rem',
      border: '2px solid #e5e7eb',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1.5rem',
        fontSize: '1.75rem',
        fontWeight: 'bold'
      }}>
        {title}
      </h2>
      <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
        {description} - 총 {items.length}문항
      </p>
      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            backgroundColor: '#f9fafb',
            padding: '1rem',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '0.5rem', color: '#171717' }}>
              <strong style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>문항 {idx + 1}:</strong> {item.wordOrPhrase}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              {item.imageOptions.map((option, optIdx) => (
                <span 
                  key={optIdx}
                  style={{
                    padding: '0.3rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    backgroundColor: option === item.correctAnswer 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : '#ffffff',
                    border: option === item.correctAnswer 
                      ? '2px solid #10b981' 
                      : '1px solid #e5e7eb',
                    color: option === item.correctAnswer ? '#10b981' : '#171717',
                    fontWeight: option === item.correctAnswer ? '600' : '400'
                  }}
                >
                  {option} {option === item.correctAnswer && '✓'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic', marginTop: '1rem' }}>
        💡 {note}
      </p>
    </div>
  );
}

// 이해도 섹션 컴포넌트
function ComprehensionSection({
  title,
  description,
  items,
  note
}: {
  title: string;
  description: string;
  items: Array<{
    dialogueOrStory: string;
    question: string;
    options: Array<{ type: 'image' | 'word'; content: string }>;
    correctAnswer: string;
  }>;
  note: string;
}) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      padding: '2rem',
      borderRadius: '20px',
      marginBottom: '2rem',
      border: '2px solid #e5e7eb',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1.5rem',
        fontSize: '1.75rem',
        fontWeight: 'bold'
      }}>
        {title}
      </h2>
      <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
        {description} - 총 {items.length}문항
      </p>
      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            backgroundColor: '#f9fafb',
            padding: '1rem',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '0.5rem', color: '#171717' }}>
              <strong style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>대화/이야기:</strong> {item.dialogueOrStory}
            </div>
            <div style={{ marginBottom: '0.5rem', color: '#171717' }}>
              <strong style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>질문:</strong> {item.question}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              {item.options.map((option, optIdx) => (
                <span 
                  key={optIdx}
                  style={{
                    padding: '0.3rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    backgroundColor: option.content === item.correctAnswer 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : '#ffffff',
                    border: option.content === item.correctAnswer 
                      ? '2px solid #10b981' 
                      : '1px solid #e5e7eb',
                    color: option.content === item.correctAnswer ? '#10b981' : '#171717',
                    fontWeight: option.content === item.correctAnswer ? '600' : '400'
                  }}
                >
                  {option.content} {option.content === item.correctAnswer && '✓'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic', marginTop: '1rem' }}>
        💡 {note}
      </p>
    </div>
  );
}

// 문항 없음 섹션 컴포넌트
function NoItemsSection({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      padding: '2rem',
      borderRadius: '20px',
      marginBottom: '2rem',
      border: '2px solid #e5e7eb',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1.5rem',
        fontSize: '1.75rem',
        fontWeight: 'bold'
      }}>
        {title}
      </h2>
      <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
        {description}
      </p>
      <div style={{
        backgroundColor: '#fef3c7',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid #fbbf24',
        color: '#92400e'
      }}>
        ⚠️ 아직 승인된 문항이 없습니다. 문항 생성 페이지에서 문항을 생성하고 승인해주세요.
      </div>
    </div>
  );
}

