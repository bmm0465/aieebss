import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

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

  // 각 평가의 문항 데이터
  const testItems = {
    LNF: {
      title: "LNF - 고대 룬 문자 해독 시험",
      description: "알파벳 인식 능력 평가",
      totalItems: 100,
      items: [
        'T', 'a', 'S', 'o', 'r', 'E', 'i', 'n', 'D', 'h',
        'f', 'P', 'm', 'C', 'u', 'L', 'd', 'G', 'H', 'R',
        's', 'N', 'I', 'O', 'A', 'e', 'T', 'c', 'b', 'F',
        'v', 'p', 'Y', 'k', 'g', 'M', 'u', 'a', 'R', 'I',
        'E', 'S', 'd', 'o', 'T', 'j', 'n', 'q', 'C', 'b',
        'h', 'L', 'A', 'P', 'r', 'f', 'e', 'K', 'V', 'z',
        'O', 't', 'i', 's', 'N', 'G', 'c', 'u', 'M', 'D',
        'a', 'E', 'H', 'k', 'Y', 'r', 'T', 'B', 'p', 'F',
        'g', 'v', 'I', 'o', 'e', 'n', 's', 'L', 'J', 'q',
        'x', 'C', 'a', 'P', 'd', 'R', 'i', 'A', 'm', 'U'
      ],
      type: 'list',
      note: '학생은 알파벳의 이름(예: A → "에이")을 말해야 합니다. LNF 표준 규격: 100개, 대소문자 균형, 빈도 높은 문자 우선, W와 소문자 l 제외.'
    },
    PSF: {
      title: "PSF - 소리의 원소 분리 시험",
      description: "음소 분리 능력 평가",
      totalItems: 110,
      items: [
        "go", "on", "at", "up", "be", "it", "so", "in", "to", "an",
        "dad", "sit", "map", "cup", "top", "pen", "cat", "dog", "get", "hot",
        "mad", "van", "pin", "son", "rug", "hit", "nut", "box", "bat", "bug",
        "win", "web", "mug", "man", "pig", "dig", "pot", "bed", "mom", "fan",
        "wig", "car", "fog", "leg", "ten", "hen", "jog", "kid", "fit", "but",
        "red", "sun", "jam", "mud", "hug", "run", "cut", "not", "tap", "pet",
        "bell", "stop", "plan", "hand", "gift", "star", "belt", "doll", "gold", "sand",
        "dot", "big", "sip", "mop", "lid", "lip", "fin", "kit", "had", "can",
        "zoo", "hop", "hat", "six", "rock", "road", "pan", "jet", "bib", "ship",
        "desk", "ski", "pull", "toad", "cold", "crab", "lamp", "drum", "nest", "tent",
        "milk", "pond", "coin", "deep", "moon", "heel", "frog", "camp", "farm", "star"
      ],
      type: 'list',
      note: '학생은 단어를 음소 단위로 분리해야 합니다 (예: cat → /k/ /æ/ /t/). PSF 표준: 초기에 쉬운 단어(2-3음소), 이후 다양한 음소 수 혼합하여 모든 난이도 평가. AI가 자동 채점합니다.'
    },
    NWF: {
      title: "NWF - 초급 주문 시전 시험",
      description: "파닉스 적용 능력 평가",
      totalItems: 122,
      items: [
        "sep", "nem", "dib", "rop", "lin", "fom", "mig", "rup", "dep", "fod",
        "pid", "rit", "mog", "pim", "sog", "tib", "pon", "heg", "dev", "seb",
        "dop", "nug", "tet", "wep", "vom", "bem", "kun", "yut", "yad", "heb",
        "pom", "gid", "pag", "kom", "wog", "yig", "lan", "nen", "het", "som",
        "tig", "fon", "tup", "nin", "hon", "vid", "wim", "pob", "sed", "yod",
        "tud", "mem", "vot", "dob", "vun", "yed", "bim", "wod", "yab", "yun",
        "lem", "fub", "vut", "gim", "wid", "reb", "wap", "mip", "wem", "yom",
        "vad", "wum", "nim", "kep", "biv", "lum", "rik", "sab", "wug", "pac",
        "fot", "lut", "nam", "tok", "zam", "neb", "wut", "cun", "rif", "lom",
        "stam", "clen", "frap", "smop", "grut", "ston", "cles", "snid", "blut", "pren",
        "glom", "trab", "clom", "snut", "krat", "flot", "clor", "jent", "galk", "vrop",
        "pler", "drem", "trul", "skom", "tolt", "vrat", "blim", "sner", "larm", "fral",
        "sket", "trak", "plon", "trup", "smot", "gren", "frim", "prun", "twet", "draf",
        "snib", "glap", "frem", "spov", "spen", "drup", "fran", "plap", "clut", "spet",
        "crum", "frin", "bap", "fek", "himp", "krad", "clanp", "zib", "wux", "jev"
      ],
      type: 'list',
      note: 'Nonsense words (무의미 단어)를 파닉스 규칙으로 읽습니다. NWF 표준: 단모음 기본 구조(72개), 자음 연속 패턴(50개).'
    },
    WRF: {
      title: "WRF - 마법 단어 활성화 시험",
      description: "단어 읽기 유창성 평가",
      totalItems: 81,
      items: [
        "it", "up", "no", "go", "he", "me", "to", "do", "big", "can",
        "dad", "hat", "cat", "sit", "mom", "dog", "pig", "pen", "leg", "pan",
        "red", "ten", "sun", "six", "run", "not", "yes", "car", "zoo", "one",
        "the", "she", "who", "how", "this", "that", "what", "swim", "jump", "stand",
        "like", "nice", "here", "said", "look", "good", "book", "door", "ball", "tall",
        "two", "too", "down", "open", "have", "come", "love", "blue", "green", "white",
        "three", "four", "five", "great", "eight", "nine", "many", "much", "close", "dance",
        "hello", "sorry", "color", "apple", "pizza", "sunny", "okay", "bye", "pencil", "sister", "eraser"
      ],
      type: 'list',
      note: '실제 단어를 빠르고 정확하게 읽는 능력을 측정합니다. WRF 표준: 4단계 난이도(기초 CVC → 자음 연속 → 장모음 → 다음절) 혼합 구성.'
    },
    ORF: {
      title: "ORF - 고대 이야기 소생술 시험",
      description: "읽기 유창성 평가",
      totalItems: 1,
      passage: `Passage 1: Drawing a Picture
Leo: What are you doing?
Mia: I am drawing a picture.
Leo: Wow. What is it?
Mia: It is a big, yellow sun.
Leo: I like your picture.

Passage 2: Juice, Please
Dan: Do you have juice?
Pam: Yes, I do. Do you like orange juice?
Dan: Yes, I do. I like orange juice.
Pam: Here.
Dan: Thank you. Bye.

Passage 3: Counting Dogs
Ken: Hello. How many dogs?
Liz: Hi! One, two, three, four.
Ken: Four dogs! Okay.

Passage 4: My New Ball
Sam: Do you have a ball?
Ann: Yes, I do. Here you are.
Sam: Thank you.
Ann: Let's play together.

Passage 5: What is This?
Max: What is this?
Kim: It is a book.
Max: Is this your pencil?
Kim: Yes, it is. It is my new pencil.`,
      type: 'passage',
      note: 'ORF 표준: 5개 지문으로 구성, 학년 수준에 맞는 어휘와 문장 구조. WCPM과 정확도를 AI가 측정합니다.'
    },
    MAZE: {
      title: "MAZE - 지혜의 미로 탈출",
      description: "독해력 및 문맥 이해 평가",
      totalItems: 10,
      questions: [
        { num: 1, sentence: "Max has a small, brown puppy. His _______ is Sam.", choices: ["hat", "name", "on"], answer: "name" },
        { num: 2, sentence: "Max likes to _______ with Sam.", choices: ["eat", "happy", "play"], answer: "play" },
        { num: 3, sentence: "Today, they will _______ to the park.", choices: ["go", "is", "red"], answer: "go" },
        { num: 4, sentence: "Max gets _______ red ball and they go.", choices: ["under", "his", "run"], answer: "his" },
        { num: 5, sentence: "The _______ is big and yellow in", choices: ["see", "bed", "sun"], answer: "sun" },
        { num: 6, sentence: "big and yellow in _______ sky.", choices: ["the", "sad", "she"], answer: "the" },
        { num: 7, sentence: "At the park, Max _______ the red ball.", choices: ["makes", "throws", "happy"], answer: "throws" },
        { num: 8, sentence: "Sam runs _______ catches it.", choices: ["for", "very", "and"], answer: "and" },
        { num: 9, sentence: "They play for _______ long time.", choices: ["see", "a", "it"], answer: "a" },
        { num: 10, sentence: "Max and Sam _______ very happy together.", choices: ["on", "eat", "are"], answer: "are" }
      ],
      type: 'maze',
      note: 'MAZE 표준: 하나의 연결된 지문(A Fun Day at the Park), 10개 문항. 매 7번째 단어 삭제, 문맥과 문법 모두 고려한 선택지.'
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: '#171717'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/owl.png" alt="문항 확인" width={60} height={60} />
              <div style={{ marginLeft: '1rem' }}>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700'
                }}>
                  📋 평가 문항 및 정답 확인
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  각 평가에 출제되는 문항과 정답을 확인할 수 있습니다
                </p>
              </div>
            </div>
            <Link 
              href="/teacher/dashboard"
              style={{
                backgroundColor: 'rgba(255,215,0,0.2)',
                color: '#FFD700',
                padding: '0.8rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                border: '2px solid rgba(255,215,0,0.5)',
                fontWeight: 'bold'
              }}
            >
              ← 대시보드로
            </Link>
          </div>
        </div>

        {/* LNF */}
        <TestItemSection 
          title={testItems.LNF.title}
          description={testItems.LNF.description}
          totalItems={testItems.LNF.totalItems}
          items={testItems.LNF.items}
          note={testItems.LNF.note}
        />

        {/* PSF */}
        <TestItemSection 
          title={testItems.PSF.title}
          description={testItems.PSF.description}
          totalItems={testItems.PSF.totalItems}
          items={testItems.PSF.items}
          note={testItems.PSF.note}
        />

        {/* NWF */}
        <TestItemSection 
          title={testItems.NWF.title}
          description={testItems.NWF.description}
          totalItems={testItems.NWF.totalItems}
          items={testItems.NWF.items}
          note={testItems.NWF.note}
        />

        {/* WRF */}
        <TestItemSection 
          title={testItems.WRF.title}
          description={testItems.WRF.description}
          totalItems={testItems.WRF.totalItems}
          items={testItems.WRF.items}
          note={testItems.WRF.note}
        />

        {/* ORF */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '1.8rem' }}>
            {testItems.ORF.title}
          </h2>
          <p style={{ opacity: 0.9, marginBottom: '1rem' }}>{testItems.ORF.description}</p>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '10px',
            marginBottom: '1rem'
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace',
              fontSize: '1rem',
              lineHeight: '1.8',
              margin: 0
            }}>
              {testItems.ORF.passage}
            </pre>
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, fontStyle: 'italic' }}>
            💡 {testItems.ORF.note}
          </p>
        </div>

        {/* MAZE */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '1.8rem' }}>
            {testItems.MAZE.title}
          </h2>
          <p style={{ opacity: 0.9, marginBottom: '1rem' }}>
            {testItems.MAZE.description} - 총 {testItems.MAZE.totalItems}문항
          </p>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {testItems.MAZE.questions.map((q) => (
              <div key={q.num} style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1rem',
                borderRadius: '8px',
                borderLeft: '3px solid #FFD700'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#FFD700' }}>문항 {q.num}:</strong> {q.sentence}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  {q.choices.map((choice, idx) => (
                    <span 
                      key={idx}
                      style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '5px',
                        fontSize: '0.9rem',
                        backgroundColor: choice === q.answer 
                          ? 'rgba(76, 175, 80, 0.3)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        border: choice === q.answer 
                          ? '2px solid #4CAF50' 
                          : '1px solid rgba(255, 255, 255, 0.2)',
                        color: choice === q.answer ? '#4CAF50' : 'white'
                      }}
                    >
                      {choice} {choice === q.answer && '✓'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, fontStyle: 'italic', marginTop: '1rem' }}>
            💡 {testItems.MAZE.note}
          </p>
        </div>
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
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: '2rem',
      borderRadius: '15px',
      marginBottom: '2rem',
      border: '1px solid rgba(255, 215, 0, 0.3)'
    }}>
      <h2 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '1.8rem' }}>
        {title}
      </h2>
      <p style={{ opacity: 0.9, marginBottom: '1rem' }}>
        {description} - 총 {totalItems}개 문항
      </p>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '1.5rem',
        borderRadius: '10px',
        maxHeight: '300px',
        overflowY: 'auto',
        marginBottom: '1rem'
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
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                borderRadius: '5px',
                textAlign: 'center',
                fontSize: '0.9rem',
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: '0.9rem', opacity: 0.7, fontStyle: 'italic' }}>
        💡 {note}
      </p>
    </div>
  );
}

