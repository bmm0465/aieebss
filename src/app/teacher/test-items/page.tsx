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
      title: "PSF - 소리 듣고 식별하기",
      description: "최소대립쌍 듣고 식별 능력 평가",
      totalItems: 20,
      items: [
        { word1: 'pin', word2: 'fin', correctAnswer: 'pin' },
        { word1: 'bat', word2: 'pat', correctAnswer: 'bat' },
        { word1: 'cat', word2: 'hat', correctAnswer: 'cat' },
        { word1: 'dog', word2: 'log', correctAnswer: 'dog' },
        { word1: 'sun', word2: 'fun', correctAnswer: 'sun' },
        { word1: 'bed', word2: 'red', correctAnswer: 'bed' },
        { word1: 'cup', word2: 'pup', correctAnswer: 'cup' },
        { word1: 'map', word2: 'cap', correctAnswer: 'map' },
        { word1: 'sit', word2: 'hit', correctAnswer: 'sit' },
        { word1: 'pen', word2: 'hen', correctAnswer: 'pen' },
        { word1: 'big', word2: 'pig', correctAnswer: 'big' },
        { word1: 'top', word2: 'pop', correctAnswer: 'top' },
        { word1: 'run', word2: 'sun', correctAnswer: 'run' },
        { word1: 'leg', word2: 'peg', correctAnswer: 'leg' },
        { word1: 'mug', word2: 'bug', correctAnswer: 'mug' },
        { word1: 'fan', word2: 'van', correctAnswer: 'fan' },
        { word1: 'ten', word2: 'pen', correctAnswer: 'ten' },
        { word1: 'box', word2: 'fox', correctAnswer: 'box' },
        { word1: 'six', word2: 'fix', correctAnswer: 'six' },
        { word1: 'web', word2: 'deb', correctAnswer: 'web' },
      ],
      type: 'minimal-pairs',
      note: '학생은 두 단어를 듣고 들려준 단어를 선택합니다. 최소대립쌍(minimal pairs)은 하나의 음소만 다른 단어 쌍입니다. vocabulary_level.json의 어휘 수준을 준수합니다.'
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
    STRESS: {
      title: "STRESS - 강세 및 리듬 패턴 파악",
      description: "강세 패턴 식별 능력 평가",
      totalItems: 20,
      items: [
        { word: 'computer', choices: ['comPUter', 'COMputer', 'compuTER'], correctAnswer: 'comPUter' },
        { word: 'banana', choices: ['baNAna', 'BAnana', 'bananA'], correctAnswer: 'baNAna' },
        { word: 'elephant', choices: ['ELEphant', 'elePHANT', 'elephANT'], correctAnswer: 'ELEphant' },
        { word: 'tomorrow', choices: ['toMORrow', 'TOmorrow', 'tomorROW'], correctAnswer: 'toMORrow' },
        { word: 'beautiful', choices: ['BEAUtiful', 'beauTIful', 'beautiFUL'], correctAnswer: 'BEAUtiful' },
      ],
      type: 'stress-pattern',
      note: '학생은 단어를 듣고 올바른 강세 패턴을 선택합니다. 2음절 이상의 단어를 사용하며, vocabulary_level.json의 어휘 수준을 준수합니다.'
    },
    MEANING: {
      title: "MEANING - 의미 이해",
      description: "단어/문장 의미 이해 능력 평가",
      totalItems: 20,
      items: [
        { wordOrPhrase: 'a red apple', imageOptions: ['red apple', 'yellow banana', 'green grape'], correctAnswer: 'red apple' },
        { wordOrPhrase: 'a big dog', imageOptions: ['big dog', 'small cat', 'blue bird'], correctAnswer: 'big dog' },
        { wordOrPhrase: 'three cats', imageOptions: ['three cats', 'two dogs', 'one bird'], correctAnswer: 'three cats' },
      ],
      type: 'meaning',
      note: '학생은 단어나 문장을 듣거나 읽고 알맞은 그림을 선택합니다. vocabulary_level.json의 어휘 수준을 준수합니다.'
    },
    COMPREHENSION: {
      title: "COMPREHENSION - 주요 정보 파악",
      description: "주요 정보 파악 능력 평가",
      totalItems: 15,
      items: [
        { 
          dialogueOrStory: 'This is my friend, Tom. He has a big, blue ball.',
          question: 'What does Tom have?',
          options: [
            { type: 'word', content: 'blue ball' },
            { type: 'word', content: 'red car' },
            { type: 'word', content: 'small yellow cat' },
          ],
          correctAnswer: 'blue ball'
        },
      ],
      type: 'comprehension',
      note: '학생은 짧은 대화나 이야기를 듣거나 읽고 질문에 맞는 답을 선택합니다. core_expressions.json의 표현을 사용하며, vocabulary_level.json의 어휘 수준을 준수합니다.'
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
          padding: '2rem',
          borderRadius: '20px',
          marginBottom: '2rem',
          border: '2px solid #e5e7eb',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/owl.png" alt="문항 확인" width={60} height={60} />
              <div style={{ marginLeft: '1rem' }}>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
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

        {/* LNF */}
        <TestItemSection 
          title={testItems.LNF.title}
          description={testItems.LNF.description}
          totalItems={testItems.LNF.totalItems}
          items={testItems.LNF.items}
          note={testItems.LNF.note}
        />

        {/* PSF */}
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
            {testItems.PSF.title}
          </h2>
          <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
            {testItems.PSF.description} - 총 {testItems.PSF.totalItems}문항
          </p>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {testItems.PSF.items.map((item: any, idx: number) => (
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
            💡 {testItems.PSF.note}
          </p>
        </div>

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
            {testItems.ORF.title}
          </h2>
          <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>{testItems.ORF.description}</p>
          <div style={{ 
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            border: '2px solid #e5e7eb'
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace',
              fontSize: '1rem',
              lineHeight: '1.8',
              margin: 0,
              color: '#171717'
            }}>
              {testItems.ORF.passage}
            </pre>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
            💡 {testItems.ORF.note}
          </p>
        </div>

        {/* STRESS */}
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
            {testItems.STRESS.title}
          </h2>
          <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
            {testItems.STRESS.description} - 총 {testItems.STRESS.totalItems}문항
          </p>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {testItems.STRESS.items.map((item: any, idx: number) => (
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
                  {item.choices.map((choice: string, optIdx: number) => (
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
            💡 {testItems.STRESS.note}
          </p>
        </div>

        {/* MEANING */}
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
            {testItems.MEANING.title}
          </h2>
          <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
            {testItems.MEANING.description} - 총 {testItems.MEANING.totalItems}문항
          </p>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {testItems.MEANING.items.map((item: any, idx: number) => (
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
                  {item.imageOptions.map((option: string, optIdx: number) => (
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
            💡 {testItems.MEANING.note}
          </p>
        </div>

        {/* COMPREHENSION */}
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
            {testItems.COMPREHENSION.title}
          </h2>
          <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '1rem' }}>
            {testItems.COMPREHENSION.description} - 총 {testItems.COMPREHENSION.totalItems}문항
          </p>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {testItems.COMPREHENSION.items.map((item, idx) => (
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
            💡 {testItems.COMPREHENSION.note}
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

